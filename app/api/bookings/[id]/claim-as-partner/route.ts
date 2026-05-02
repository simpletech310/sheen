import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";
import { checkStripeReadiness, readinessMessage } from "@/lib/stripe/readiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Confirm the user is an active partner.
  const { data: pp } = await supabase
    .from("partner_profiles")
    .select("status, business_name, stripe_account_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!pp || pp.status !== "active") {
    return NextResponse.json({ error: "Partner not active" }, { status: 403 });
  }

  // Same Stripe-readiness gate as the washer claim path.
  const readiness = await checkStripeReadiness(pp.stripe_account_id);
  if (!readiness.ready) {
    return NextResponse.json(
      { error: readinessMessage(readiness.reason), code: readiness.reason, action_url: "/partner/onboarding" },
      { status: 409 }
    );
  }

  // Direct-request hold check — partners can't snipe a booking that
  // a customer specifically requested for a solo washer. Same logic
  // as /claim/route.ts.
  const { data: jobMeta } = await supabase
    .from("bookings")
    .select("requested_washer_id, request_expires_at, request_declined_at")
    .eq("id", params.id)
    .maybeSingle();
  const reqExpiryMs = (jobMeta as any)?.request_expires_at
    ? new Date((jobMeta as any).request_expires_at).getTime()
    : null;
  const heldForOther =
    !!(jobMeta as any)?.requested_washer_id &&
    reqExpiryMs &&
    reqExpiryMs > Date.now() &&
    !(jobMeta as any).request_declined_at;
  if (heldForOther) {
    const minsLeft = Math.max(
      1,
      Math.ceil((reqExpiryMs! - Date.now()) / 60000)
    );
    return NextResponse.json(
      {
        error: `This booking was sent directly to a specific pro for ~${minsLeft} more min. It'll fall to the open queue if they don't accept.`,
        code: "direct_request_locked",
      },
      { status: 409 }
    );
  }

  // Atomic claim: only update if still unclaimed by anyone AND there's
  // no live direct-request hold pointing at someone else.
  const { data, error } = await supabase
    .from("bookings")
    .update({
      assigned_partner_id: user.id,
      status: "matched",
      requested_washer_id: null,
      request_expires_at: null,
    })
    .eq("id", params.id)
    .eq("status", "pending")
    .is("assigned_washer_id", null)
    .is("assigned_partner_id", null)
    .or(
      [
        "requested_washer_id.is.null",
        `request_expires_at.lte.${new Date().toISOString()}`,
        "request_declined_at.not.is.null",
      ].join(",")
    )
    .select("id, customer_id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Already claimed" }, { status: 409 });

  await supabase.from("booking_events").insert({
    booking_id: params.id,
    type: "matched",
    actor_id: user.id,
    payload: { partner: pp.business_name },
  });

  // Notify the customer.
  sendPushToUser(data.customer_id, {
    title: "Your wash is matched",
    body: `${pp.business_name} is on your booking.`,
    url: `/app/tracking/${params.id}`,
    tag: `booking-${params.id}`,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}

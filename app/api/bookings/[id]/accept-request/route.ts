import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";
import { checkStripeReadiness, readinessMessage } from "@/lib/stripe/readiness";
import { checkWasherEligibility } from "@/lib/job-matching";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/bookings/[id]/accept-request
 *
 * Pro accepts a direct request that was routed to them. Atomic-ish:
 * only succeeds if the booking is still pending and still requested
 * from this user (and hasn't expired).
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("washer_profiles")
    .select(
      "stripe_account_id, has_own_water, has_own_power, has_pressure_washer, can_detail_interior, can_do_paint_correction, can_wash_big_rig"
    )
    .eq("user_id", user.id)
    .maybeSingle();
  const readiness = await checkStripeReadiness(profile?.stripe_account_id);
  if (!readiness.ready) {
    return NextResponse.json(
      { error: readinessMessage(readiness.reason), code: readiness.reason, action_url: "/pro/verify" },
      { status: 409 }
    );
  }

  const { data: jobMeta } = await supabase
    .from("bookings")
    .select(
      "services(category, requires_water, requires_power, requires_pressure_washer, requires_paint_correction, requires_interior_detail), addresses(has_water, has_power)"
    )
    .eq("id", params.id)
    .maybeSingle();
  const elig = checkWasherEligibility(
    (jobMeta as any)?.services,
    (jobMeta as any)?.addresses,
    profile as any
  );
  if (!elig.ok) {
    return NextResponse.json(
      {
        error: `You can't take this request — ${elig.reasons.join(" · ")}.`,
        code: "capability_mismatch",
        reasons: elig.reasons,
      },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("bookings")
    .update({
      assigned_washer_id: user.id,
      status: "matched",
      requested_washer_id: null,
      request_expires_at: null,
    })
    .eq("id", params.id)
    .eq("status", "pending")
    .eq("requested_washer_id", user.id)
    .gt("request_expires_at", new Date().toISOString())
    .is("assigned_washer_id", null)
    .select("id, customer_id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) {
    return NextResponse.json(
      { error: "Request expired or already taken" },
      { status: 409 }
    );
  }

  await supabase.from("booking_events").insert({
    booking_id: params.id,
    type: "request_accepted",
    actor_id: user.id,
  });

  const { data: pro } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  sendPushToUser(data.customer_id, {
    title: "Your requested pro accepted",
    body: `${pro?.full_name ?? "Your pro"} is on your booking.`,
    url: `/app/tracking/${params.id}`,
    tag: `booking-${params.id}`,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}

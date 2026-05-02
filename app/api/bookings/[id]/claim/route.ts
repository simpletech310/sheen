import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";
import { checkStripeReadiness, readinessMessage } from "@/lib/stripe/readiness";
import { checkWasherEligibility } from "@/lib/job-matching";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Block claims unless the washer's Stripe Connect account can both accept
  // charges and receive payouts — otherwise we'd assign a job that can't pay out.
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

  // Capability gate: fetch the service + site flags and run the same matcher
  // the queue uses. Defends against direct claims that bypass the queue UI
  // (deep links, stale realtime cache, partner who toggled equipment off).
  // Also pulls the direct-request fields so we can enforce the 10-min
  // exclusivity hold server-side — UI hides held jobs from other pros,
  // but a deep link or stale cache must not be able to bypass it.
  const { data: jobMeta } = await supabase
    .from("bookings")
    .select(
      "requested_washer_id, request_expires_at, request_declined_at, services(category, requires_water, requires_power, requires_pressure_washer, requires_paint_correction, requires_interior_detail), addresses(has_water, has_power)"
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
        error: `You can't take this job — ${elig.reasons.join(" · ")}.`,
        code: "capability_mismatch",
        reasons: elig.reasons,
      },
      { status: 409 }
    );
  }

  // Direct-request hold: if this booking is currently locked to a
  // different washer (within their 10-minute exclusivity window), the
  // current pro can't claim. The requested pro takes it via
  // /accept-request; everyone else waits for the window to expire (or
  // the pro to decline) before it falls into the open queue. Self
  // (requested_washer_id === user.id) is allowed to claim through
  // either route — accept-request OR claim — for resilience.
  const reqExpiryMs = (jobMeta as any)?.request_expires_at
    ? new Date((jobMeta as any).request_expires_at).getTime()
    : null;
  const heldForOther =
    !!(jobMeta as any)?.requested_washer_id &&
    (jobMeta as any).requested_washer_id !== user.id &&
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
        error: `This booking was sent directly to another pro for ~${minsLeft} more min. It'll fall to the open queue if they don't accept.`,
        code: "direct_request_locked",
      },
      { status: 409 }
    );
  }

  // Atomic claim: only update if still unclaimed AND not currently
  // locked to a different pro. The eq/is filters mean two pros hitting
  // claim at the same instant can't both win — one update will match
  // zero rows.
  const { data, error } = await supabase
    .from("bookings")
    .update({
      assigned_washer_id: user.id,
      status: "matched",
      // Clear any expired/declined direct-request fields so the booking
      // looks clean to downstream consumers.
      requested_washer_id: null,
      request_expires_at: null,
    })
    .eq("id", params.id)
    .eq("status", "pending")
    .is("assigned_washer_id", null)
    .is("assigned_partner_id", null)
    // Belt-and-suspenders: ensure the row didn't flip to an active hold
    // for someone else between our pre-check and this UPDATE. If there
    // IS a hold, it must either be expired or pointed at us.
    .or(
      [
        "requested_washer_id.is.null",
        `requested_washer_id.eq.${user.id}`,
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
  });

  // Pull the pro's name to make the customer push more personal.
  const { data: pro } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  sendPushToUser(data.customer_id, {
    title: "Your wash is matched",
    body: `${pro?.full_name ?? "A Sheen pro"} is on your booking.`,
    url: `/app/tracking/${params.id}`,
    tag: `booking-${params.id}`,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}

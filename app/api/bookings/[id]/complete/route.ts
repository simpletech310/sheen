import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { computeFees } from "@/lib/stripe/fees";
import { awardPoints, pointsForService, checkAchievements } from "@/lib/loyalty";
import { sendPushToUser } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const stripe = getStripe();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, assigned_washer_id, assigned_partner_id, service_cents, stripe_payment_intent_id, status, customer_id, service_id, checklist_progress")
    .eq("id", params.id)
    .maybeSingle();

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isWasher = booking.assigned_washer_id === user.id;
  const isPartner = booking.assigned_partner_id === user.id;
  if (!isWasher && !isPartner) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  if (booking.status === "completed") {
    return NextResponse.json({ ok: true, already_complete: true });
  }

  // Gate completion on the checklist. Every item must be marked done;
  // items that require a photo must have one recorded. This is the QA
  // step that proves the work was actually done before payment can
  // release.
  const { data: items } = await supabase
    .from("service_checklist_items")
    .select("id, label, requires_photo")
    .eq("service_id", booking.service_id);

  const progress: Record<string, { done_at?: string; photo_path?: string | null }> =
    (booking.checklist_progress as any) ?? {};
  const missing: string[] = [];
  for (const it of items ?? []) {
    const entry = progress[it.id];
    if (!entry?.done_at) {
      missing.push(it.label);
      continue;
    }
    if (it.requires_photo && !entry.photo_path) {
      missing.push(`${it.label} (photo missing)`);
    }
  }
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: `Checklist not complete`,
        missing,
      },
      { status: 400 }
    );
  }

  // Expect 4 mandatory final photos
  let workPhotoPaths: string[] = [];
  try {
    const body = await req.json();
    if (Array.isArray(body.work_photo_paths)) {
      workPhotoPaths = body.work_photo_paths;
    }
  } catch (e) {
    // Body is optional if fetch didn't send one, but in this case we require it
  }

  if (workPhotoPaths.length !== 4) {
    return NextResponse.json(
      { error: "Must upload exactly 4 final photos (front, back, left, right)" },
      { status: 400 }
    );
  }

  // Mark complete
  await supabase
    .from("bookings")
    .update({ 
      status: "completed", 
      completed_at: new Date().toISOString(),
      work_photo_paths: workPhotoPaths
    })
    .eq("id", params.id);

  // Compute fees and look up the recipient's connected account
  const fees = computeFees({
    serviceCents: booking.service_cents,
    routedTo: isPartner ? "partner" : "solo_washer",
  });

  let stripeAccountId: string | null = null;
  if (isWasher) {
    const { data: wp } = await supabase
      .from("washer_profiles")
      .select("stripe_account_id, jobs_completed")
      .eq("user_id", user.id)
      .maybeSingle();
    stripeAccountId = wp?.stripe_account_id ?? null;
    // Increment job count
    await supabase
      .from("washer_profiles")
      .update({ jobs_completed: (wp?.jobs_completed ?? 0) + 1 })
      .eq("user_id", user.id);
  } else if (isPartner) {
    const { data: pp } = await supabase
      .from("partner_profiles")
      .select("stripe_account_id, jobs_completed")
      .eq("user_id", user.id)
      .maybeSingle();
    stripeAccountId = pp?.stripe_account_id ?? null;
    await supabase
      .from("partner_profiles")
      .update({ jobs_completed: (pp?.jobs_completed ?? 0) + 1 })
      .eq("user_id", user.id);
  }

  // Upsert payout row in 'pending' state
  const { data: payout } = await supabase
    .from("payouts")
    .upsert(
      {
        washer_id: isWasher ? user.id : null,
        partner_id: isPartner ? user.id : null,
        booking_id: booking.id,
        amount_cents: fees.washerOrPartnerNet,
        status: "pending",
        kind: "wash",
      },
      { onConflict: "booking_id,kind" }
    )
    .select("id")
    .maybeSingle();

  // NOTE: Stripe transfer is intentionally NOT triggered here. Funds are
  // held in escrow until the customer hits "Approve" on their tracking
  // page (or 24h auto-approval, v2). The actual release is handled by
  // /api/bookings/[id]/approve via lib/payout/release.ts. This guards
  // against pros marking complete on a job that wasn't actually done.
  void stripe;
  void stripeAccountId;
  void fees;
  void payout;

  await supabase.from("booking_events").insert({
    booking_id: booking.id,
    type: "completed",
    actor_id: user.id,
    payload: { net_to_pro_cents: fees.washerOrPartnerNet },
  });

  // Loyalty: award points to the customer + check achievements both sides
  try {
    const earned = pointsForService(booking.service_cents);
    if (earned > 0) {
      await awardPoints({
        userId: booking.customer_id,
        points: earned,
        reason: "wash_completed",
        bookingId: booking.id,
      });
    }
    await supabase.from("bookings").update({ points_earned: earned }).eq("id", booking.id);
    const customerNew = await checkAchievements(booking.customer_id);
    const proNew = await checkAchievements(user.id);

    // Push notifications — funds held until customer approves.
    await sendPushToUser(booking.customer_id, {
      title: "Your Sheen is done — tap to approve",
      body: "Review the photos and approve to pay your pro.",
      url: `/app/tracking/${booking.id}`,
      tag: `booking-${booking.id}`,
    }).catch(() => {});
    for (const a of [...customerNew]) {
      await sendPushToUser(booking.customer_id, {
        title: "New badge unlocked",
        body: a.replace(/_/g, " "),
        url: "/app/me/achievements",
      }).catch(() => {});
    }
    for (const a of [...proNew]) {
      await sendPushToUser(user.id, {
        title: "New badge unlocked",
        body: a.replace(/_/g, " "),
      }).catch(() => {});
    }
  } catch (e) {
    console.error("Loyalty/push error:", e);
  }

  return NextResponse.json({ ok: true });
}

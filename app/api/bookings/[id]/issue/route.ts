import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";
import { PENALTY_RULES, computePenaltyAmount, type PenaltyKey } from "@/lib/penalties";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ISSUE_KEYS = [
  "customer_no_show",
  "no_water",
  "no_power",
  "site_unsafe",
] as const satisfies ReadonlyArray<PenaltyKey>;

const Body = z.object({
  reason: z.enum(ISSUE_KEYS),
  notes: z.string().max(1000).optional().nullable(),
});

/**
 * POST /api/bookings/[id]/issue
 *
 * Pro flags a problem on site. Creates a penalty against the customer
 * and marks the booking as cancelled with the issue recorded as the
 * cancellation reason. The customer's payment is held (no auto-refund);
 * admin reviews and decides on partial/full release.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = Body.parse(await req.json());

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, customer_id, status, total_cents, assigned_washer_id, assigned_partner_id"
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAssignedPro =
    booking.assigned_washer_id === user.id || booking.assigned_partner_id === user.id;
  if (!isAssignedPro) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  if (["completed", "cancelled", "disputed"].includes(booking.status)) {
    return NextResponse.json(
      { error: "This wash is already closed." },
      { status: 409 }
    );
  }

  const rule = PENALTY_RULES[body.reason];
  const amount = computePenaltyAmount(rule, booking.total_cents);

  await supabase.from("penalties").insert({
    booking_id: booking.id,
    user_id: booking.customer_id,
    party: "customer",
    reason: body.reason,
    amount_cents: amount,
    status: "applied",
    applied_at: new Date().toISOString(),
    applied_by: user.id,
    notes: body.notes ?? rule.description,
  });

  await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
      cancellation_reason: `Pro flagged: ${body.reason}${body.notes ? ` — ${body.notes}` : ""}`,
    })
    .eq("id", booking.id);

  await supabase.from("booking_events").insert({
    booking_id: booking.id,
    type: "issue_flagged",
    actor_id: user.id,
    payload: { reason: body.reason, notes: body.notes ?? null, penalty_cents: amount },
  });

  // Notify the customer.
  sendPushToUser(booking.customer_id, {
    title: "Wash flagged",
    body:
      body.reason === "customer_no_show"
        ? "Pro arrived but couldn't reach you. We'll review."
        : body.reason === "no_water"
        ? "Pro reported no working water at the site."
        : body.reason === "no_power"
        ? "Pro reported no working power at the site."
        : "Pro flagged the site as unsafe.",
    url: `/app/washes/${booking.id}`,
    tag: `issue-${booking.id}`,
  }).catch(() => {});

  return NextResponse.json({ ok: true, penalty_cents: amount });
}

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { computeFees } from "@/lib/stripe/fees";
import { nextRunDate, applyWindowToDate } from "@/lib/recurring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel calls this on a schedule; the runtime allows up to 60s on Hobby.
export const maxDuration = 60;

/**
 * Daily cron: materialize bookings for any active+unpaused recurring
 * template whose next_run_at is within the next 36 hours. Inserts a
 * pending booking + booking_vehicles rows, then advances next_run_at
 * by the frequency.
 *
 * Auth: Vercel-Cron header is enforced when CRON_SECRET is set; without
 * a secret we accept any caller (useful for manual dev runs).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supa = createServiceClient();
  const horizon = new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString();

  const { data: templates, error } = await supa
    .from("recurring_booking_templates")
    .select(
      "id, user_id, service_id, address_id, vehicle_ids, frequency, preferred_window, next_run_at, services(category, base_price_cents)"
    )
    .eq("active", true)
    .eq("paused", false)
    .lte("next_run_at", horizon);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const created: string[] = [];
  const skipped: string[] = [];

  for (const t of templates ?? []) {
    const service = (t as any).services;
    if (!service) {
      skipped.push(`${t.id}: no service`);
      continue;
    }

    // Compute the actual booking window from the template's preferred_window
    // anchored on next_run_at.
    const target = new Date(t.next_run_at);
    const { start, end } = applyWindowToDate(t.preferred_window, target);

    const isAuto = service.category === "auto";
    const vehicleCount = isAuto ? Math.max(1, t.vehicle_ids?.length ?? 1) : 1;
    const totalServiceCents = service.base_price_cents * vehicleCount;
    const fees = computeFees({ serviceCents: totalServiceCents, routedTo: "solo_washer" });

    const { data: booking, error: bookingErr } = await supa
      .from("bookings")
      .insert({
        customer_id: t.user_id,
        service_id: t.service_id,
        address_id: t.address_id,
        vehicle_id: isAuto ? t.vehicle_ids?.[0] ?? null : null,
        vehicle_count: vehicleCount,
        scheduled_window_start: start.toISOString(),
        scheduled_window_end: end.toISOString(),
        service_cents: fees.serviceCents,
        fees_cents: fees.trustFee,
        total_cents: fees.customerCharge,
        status: "pending",
        recurring_template_id: t.id,
      })
      .select("id")
      .maybeSingle();

    if (bookingErr || !booking) {
      skipped.push(`${t.id}: ${bookingErr?.message ?? "insert failed"}`);
      continue;
    }

    if (isAuto && t.vehicle_ids && t.vehicle_ids.length > 0) {
      await supa.from("booking_vehicles").insert(
        t.vehicle_ids.map((vid: string) => ({
          booking_id: booking.id,
          vehicle_id: vid,
          condition_photo_paths: [],
        }))
      );
    }

    await supa.from("booking_events").insert({
      booking_id: booking.id,
      type: "created",
      actor_id: t.user_id,
      payload: { source: "recurring", template_id: t.id },
    });

    // Advance the template.
    const next = nextRunDate(t.frequency, target);
    await supa
      .from("recurring_booking_templates")
      .update({
        next_run_at: next.toISOString(),
        last_materialized_at: new Date().toISOString(),
        last_booking_id: booking.id,
      })
      .eq("id", t.id);

    created.push(booking.id);
  }

  return NextResponse.json({
    ok: true,
    created: created.length,
    skipped: skipped.length,
    detail: { created, skipped },
  });
}

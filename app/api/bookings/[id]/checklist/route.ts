import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  item_id: z.string().uuid(),
  // booking_vehicle_id — required for any item that runs per-vehicle
  // (every base-service item, plus any addon attached to a vehicle).
  // Null is only valid for legacy "applies to whole booking" addons.
  booking_vehicle_id: z.string().uuid().optional().nullable(),
  // null/undefined = uncheck. A non-empty payload (with optional photo) = check.
  done: z.boolean().default(true),
  photo_path: z.string().min(1).max(512).optional().nullable(),
});

/**
 * PATCH /api/bookings/[id]/checklist
 * Body: { item_id, booking_vehicle_id?, done, photo_path? }
 *
 * Pro toggles a single checklist item as done / not-done. Items can
 * be EITHER:
 *   - service_checklist_items (the base wash) — run once per vehicle
 *     on the booking, so booking_vehicle_id is required and the
 *     progress entry is keyed by ${bvId}:${itemId}.
 *   - addon_checklist_items — each addon is attached to a specific
 *     booking_vehicle_id (via migration 0036), so the same per-vehicle
 *     keying applies. Legacy addons without a vehicle FK fall back to
 *     "booking:${itemId}".
 *
 * State lives in bookings.checklist_progress (jsonb map). Every flip
 * is a single UPDATE — no per-item row churn.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = Body.parse(await req.json());

  // Verify booking + ownership.
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, assigned_washer_id, status, service_id, checklist_progress, booking_addons(addon_id, booking_vehicle_id), booking_vehicles(id)"
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.assigned_washer_id !== user.id) {
    return NextResponse.json({ error: "Not your job" }, { status: 403 });
  }
  if (!["matched", "en_route", "arrived", "in_progress"].includes(booking.status)) {
    return NextResponse.json(
      { error: "Booking isn't in a workable state" },
      { status: 409 }
    );
  }

  const bvIds = new Set(((booking as any).booking_vehicles ?? []).map((b: any) => b.id));
  const addonIdsOnBooking = new Set(
    ((booking as any).booking_addons ?? []).map((a: any) => a.addon_id)
  );

  // Validate the item belongs to either the booking's service OR an
  // addon the customer ordered on this booking.
  const [{ data: serviceItem }, { data: addonItem }] = await Promise.all([
    supabase
      .from("service_checklist_items")
      .select("id, requires_photo, label")
      .eq("id", body.item_id)
      .eq("service_id", booking.service_id)
      .maybeSingle(),
    supabase
      .from("addon_checklist_items")
      .select("id, requires_photo, label, addon_id")
      .eq("id", body.item_id)
      .maybeSingle(),
  ]);
  const item = serviceItem ?? addonItem;
  if (!item) {
    return NextResponse.json(
      { error: "Checklist item not found" },
      { status: 400 }
    );
  }
  // Addon items must belong to an addon on THIS booking.
  if (addonItem && !addonIdsOnBooking.has((addonItem as any).addon_id)) {
    return NextResponse.json(
      { error: "That add-on isn't on this booking" },
      { status: 400 }
    );
  }

  // Per-vehicle keying — bvId is required when the booking has any
  // vehicles. (Home-category bookings have none and fall back to
  // a "booking:" prefix.)
  let key: string;
  if (bvIds.size > 0) {
    if (!body.booking_vehicle_id || !bvIds.has(body.booking_vehicle_id)) {
      return NextResponse.json(
        { error: "Pick which vehicle this item is for" },
        { status: 400 }
      );
    }
    key = `${body.booking_vehicle_id}:${body.item_id}`;
  } else {
    key = `booking:${body.item_id}`;
  }

  if (body.done && item.requires_photo && !body.photo_path) {
    return NextResponse.json(
      { error: `"${item.label}" needs a photo to count as done` },
      { status: 400 }
    );
  }

  const progress: Record<string, any> = (booking.checklist_progress as any) ?? {};
  if (body.done) {
    progress[key] = {
      done_at: new Date().toISOString(),
      photo_path: body.photo_path ?? progress[key]?.photo_path ?? null,
    };
  } else {
    delete progress[key];
  }

  const { error } = await supabase
    .from("bookings")
    .update({ checklist_progress: progress })
    .eq("id", booking.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, progress });
}

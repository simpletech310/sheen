import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Customer-scoped read of a single booking. Used by the rate page and any
// future surface that needs the full booking shape (vehicles, checklist,
// photos) without re-rolling the same Supabase joins each time.
//
// Authorisation: the requester must be either the booking customer or the
// assigned washer/partner. Anyone else gets 404 (not 403, to avoid leaking
// existence).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, status, customer_id, assigned_washer_id, assigned_partner_id, service_id, address_id, scheduled_window_start, scheduled_window_end, completed_at, customer_approved_at, funds_released_at, total_cents, service_cents, fees_cents, tip_cents, points_earned, vehicle_count, work_photo_paths, checklist_progress, services(tier_name, category), addresses(street, city, state, zip)"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isCustomer = booking.customer_id === user.id;
  const isAssignedPro =
    booking.assigned_washer_id === user.id || booking.assigned_partner_id === user.id;
  if (!isCustomer && !isAssignedPro) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [{ data: bvRows }, { data: checklistItems }] = await Promise.all([
    supabase
      .from("booking_vehicles")
      .select(
        "vehicle_id, condition_photo_paths, vehicles(year, make, model, color, plate, notes)"
      )
      .eq("booking_id", booking.id),
    supabase
      .from("service_checklist_items")
      .select("id, label, hint, requires_photo, sort_order")
      .eq("service_id", (booking as any).service_id)
      .order("sort_order"),
  ]);

  const checklistProgress = ((booking as any).checklist_progress ?? {}) as Record<
    string,
    { done_at?: string; photo_path?: string | null }
  >;
  const conditionPhotoPaths: string[] = (bvRows ?? []).flatMap(
    (r: any) => r.condition_photo_paths ?? []
  );
  const workPhotoPaths: string[] = (booking as any).work_photo_paths ?? [];
  const checklistPhotoPaths = Object.values(checklistProgress)
    .map((e) => e?.photo_path)
    .filter((p): p is string => !!p);

  const photoUrls = await signedUrls("booking-photos", [
    ...conditionPhotoPaths,
    ...workPhotoPaths,
    ...checklistPhotoPaths,
  ]);

  return NextResponse.json({
    booking,
    vehicles: bvRows ?? [],
    checklist: {
      items: checklistItems ?? [],
      progress: checklistProgress,
    },
    photos: {
      condition: conditionPhotoPaths.map((p) => ({ path: p, url: photoUrls[p] ?? null })),
      work: workPhotoPaths.map((p) => ({ path: p, url: photoUrls[p] ?? null })),
      checklist: photoUrls,
    },
  });
}

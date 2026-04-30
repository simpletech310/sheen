import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  item_id: z.string().uuid(),
  // null/undefined = uncheck. A non-empty payload (with optional photo) = check.
  done: z.boolean().default(true),
  photo_path: z.string().min(1).max(512).optional().nullable(),
});

/**
 * PATCH /api/bookings/[id]/checklist
 * Body: { item_id, done, photo_path? }
 *
 * Pro toggles a single checklist item as done / not-done. If the item
 * requires a photo, photo_path must be present. We keep state in
 * bookings.checklist_progress (jsonb map) so there's no per-item row
 * churn — every check is a single UPDATE.
 *
 * RLS keeps the booking scoped to the assigned washer.
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
      "id, assigned_washer_id, status, service_id, checklist_progress"
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

  // Confirm the item belongs to this booking's service.
  const { data: item } = await supabase
    .from("service_checklist_items")
    .select("id, requires_photo, label")
    .eq("id", body.item_id)
    .eq("service_id", booking.service_id)
    .maybeSingle();
  if (!item) {
    return NextResponse.json(
      { error: "Checklist item doesn't belong to this job" },
      { status: 400 }
    );
  }

  // If the item requires a photo, refuse to mark it done without one.
  // Photo path is optional on uncheck.
  if (body.done && item.requires_photo && !body.photo_path) {
    return NextResponse.json(
      { error: `"${item.label}" needs a photo to count as done` },
      { status: 400 }
    );
  }

  const progress: Record<string, any> = (booking.checklist_progress as any) ?? {};
  if (body.done) {
    progress[body.item_id] = {
      done_at: new Date().toISOString(),
      photo_path: body.photo_path ?? progress[body.item_id]?.photo_path ?? null,
    };
  } else {
    delete progress[body.item_id];
  }

  const { error } = await supabase
    .from("bookings")
    .update({ checklist_progress: progress })
    .eq("id", booking.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, progress });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  photos: z.array(
    z.object({
      kind: z.enum(["before", "after"]),
      storage_path: z.string(),
    })
  ),
});

/**
 * POST /api/bookings/[id]/photos — register uploaded photos against a booking.
 * Caller has already uploaded the file via the signed upload URL from /api/upload.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Only the assigned washer (or admin) can register photos for this booking.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, assigned_washer_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.assigned_washer_id !== user.id) {
    const { data: u } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
    if (u?.role !== "admin") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const body = Body.parse(await req.json());

  const rows = body.photos.map((p) => ({
    booking_id: params.id,
    kind: p.kind,
    storage_path: p.storage_path,
  }));
  const { error } = await supabase.from("booking_photos").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("booking_events").insert({
    booking_id: params.id,
    type: "photos_uploaded",
    actor_id: user.id,
    payload: { count: rows.length },
  });

  return NextResponse.json({ ok: true, count: rows.length });
}

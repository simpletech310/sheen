import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  lat: z.number(),
  lng: z.number(),
  heading: z.number().optional(),
  speed_mph: z.number().optional(),
});

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = Body.parse(await req.json());
  const { error } = await supabase.from("washer_positions").upsert({
    washer_id: user.id,
    lat: body.lat,
    lng: body.lng,
    heading: body.heading ?? null,
    speed_mph: body.speed_mph ?? null,
    updated_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

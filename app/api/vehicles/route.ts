import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensurePublicUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vehicles: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // FK target safety net — older accounts and edge-cased signups can land
  // without a public.users row, which would 500 the vehicle insert below
  // with a foreign key violation.
  await ensurePublicUser(user);

  const body = await req.json().catch(() => ({}));
  const { year, make, model, color, plate, notes, photo_paths, is_default, vehicle_type, vehicle_class } = body ?? {};
  if (!make || !model) {
    return NextResponse.json({ error: "Make and model are required" }, { status: 400 });
  }
  const vType = vehicle_type === "big_rig" ? "big_rig" : "auto";
  const ALLOWED_CLASSES = new Set(["sedan", "suv", "truck", "van", "coupe", "sports", "wagon", "hatchback", "ev", "classic", "other"]);
  const vClass = typeof vehicle_class === "string" && ALLOWED_CLASSES.has(vehicle_class) ? vehicle_class : null;

  // If is_default, clear any other default first.
  if (is_default) {
    await supabase
      .from("vehicles")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .eq("is_default", true);
  }

  const { data, error } = await supabase
    .from("vehicles")
    .insert({
      user_id: user.id,
      year: year ? Number(year) : null,
      make,
      model,
      color: color ?? null,
      plate: plate ?? null,
      notes: notes ?? null,
      photo_paths: Array.isArray(photo_paths) ? photo_paths : [],
      is_default: !!is_default,
      vehicle_type: vType,
      vehicle_class: vClass,
    })
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vehicle: data });
}

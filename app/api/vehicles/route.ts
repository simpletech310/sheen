import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const body = await req.json().catch(() => ({}));
  const { year, make, model, color, plate, notes, photo_paths, is_default } = body ?? {};
  if (!make || !model) {
    return NextResponse.json({ error: "Make and model are required" }, { status: 400 });
  }

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
    })
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vehicle: data });
}

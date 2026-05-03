import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Composite key for dedupe — we don't trust geocoded lat/lng to match
// across two bookings of the same address (mapbox can drift), so we
// key on the street/unit/city/state/zip text instead.
function dedupKey(a: any): string {
  return [a.street, a.unit ?? "", a.city, a.state, a.zip]
    .map((s) => String(s ?? "").trim().toLowerCase())
    .join("|");
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const all = data ?? [];

  // Dedupe by composite address — keep the most recent (created_at desc
  // ordering above means first-seen wins). Without this, the listing
  // grows by one row every time the customer books to the same address
  // because /api/stripe/checkout inserts a fresh row per booking.
  const seen = new Set<string>();
  const deduped: any[] = [];
  for (const a of all) {
    const k = dedupKey(a);
    if (k === "||||" || seen.has(k)) continue;
    seen.add(k);
    deduped.push(a);
  }

  // Two buckets:
  //   - User-saved places: tagged HOME/WORK/etc. (any tag that isn't 'JOB').
  //     These the customer explicitly created → keep all of them.
  //   - Recent (auto-created by booking checkout, tag='JOB'): cap to 2 so
  //     the picker stays scannable.
  const tagged = deduped.filter(
    (a) => a.tag && String(a.tag).toUpperCase() !== "JOB"
  );
  const recent = deduped
    .filter((a) => !a.tag || String(a.tag).toUpperCase() === "JOB")
    .slice(0, 2);

  return NextResponse.json({ places: [...tagged, ...recent] });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { tag, street, unit, city, state, zip, lat, lng, notes, is_default } = body ?? {};
  if (!street || !city || !state || !zip) {
    return NextResponse.json(
      { error: "Street, city, state, and zip are required" },
      { status: 400 }
    );
  }

  if (is_default) {
    await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .eq("is_default", true);
  }

  const { data, error } = await supabase
    .from("addresses")
    .insert({
      user_id: user.id,
      tag: tag ?? null,
      street,
      unit: unit ?? null,
      city,
      state,
      zip,
      lat: lat ?? null,
      lng: lng ?? null,
      notes: notes ?? null,
      is_default: !!is_default,
    })
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ place: data });
}

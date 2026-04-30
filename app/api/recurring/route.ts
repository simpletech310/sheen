import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { applyWindowToDate } from "@/lib/recurring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PostBody = z.object({
  service_id: z.string().uuid(),
  address_id: z.string().uuid().optional().nullable(),
  vehicle_ids: z.array(z.string().uuid()).max(10).default([]),
  frequency: z.enum(["weekly", "biweekly", "monthly"]),
  preferred_window: z.string().min(3).max(64),
  start_in_days: z.number().int().min(0).max(365).default(7),
});

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("recurring_booking_templates")
    .select(
      "id, frequency, preferred_window, next_run_at, active, paused, vehicle_ids, last_materialized_at, services(tier_name, category, base_price_cents), addresses(street, city)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = PostBody.parse(await req.json());

  const firstRun = new Date();
  firstRun.setDate(firstRun.getDate() + body.start_in_days);
  // Anchor on the configured window's hours.
  const { start } = applyWindowToDate(body.preferred_window, firstRun);

  const { data, error } = await supabase
    .from("recurring_booking_templates")
    .insert({
      user_id: user.id,
      service_id: body.service_id,
      address_id: body.address_id ?? null,
      vehicle_ids: body.vehicle_ids,
      frequency: body.frequency,
      preferred_window: body.preferred_window,
      next_run_at: start.toISOString(),
      active: true,
      paused: false,
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, template_id: data?.id });
}

const PatchBody = z.object({
  id: z.string().uuid(),
  paused: z.boolean().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = PatchBody.parse(await req.json());

  const updates: Record<string, any> = {};
  if (typeof body.paused === "boolean") updates.paused = body.paused;
  if (typeof body.active === "boolean") updates.active = body.active;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("recurring_booking_templates")
    .update(updates)
    .eq("id", body.id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

const DeleteBody = z.object({ id: z.string().uuid() });

export async function DELETE(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = DeleteBody.parse(await req.json());

  const { error } = await supabase
    .from("recurring_booking_templates")
    .delete()
    .eq("id", body.id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}


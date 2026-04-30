import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  business_name: z.string().min(2).max(120),
  contact_name: z.string().max(120).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  state: z.string().max(2).optional().nullable(),
  zip: z.string().max(10).optional().nullable(),
  service_type: z.string().max(80),
  square_footage: z.number().int().min(0).max(1_000_000).optional().nullable(),
  frequency: z.string().max(40).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const body = Body.parse(await req.json());

  const { data, error } = await supabase
    .from("commercial_leads")
    .insert({
      user_id: user?.id ?? null,
      business_name: body.business_name,
      contact_name: body.contact_name ?? null,
      email: body.email ?? user?.email ?? null,
      phone: body.phone ?? null,
      address: body.address ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      zip: body.zip ?? null,
      service_type: body.service_type,
      square_footage: body.square_footage ?? null,
      frequency: body.frequency ?? null,
      notes: body.notes ?? null,
      status: "new",
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, lead_id: data?.id });
}

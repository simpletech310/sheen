import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const Body = z.object({
  business_name: z.string().min(2),
  type: z.string(),
  years: z.string(),
  capabilities: z.array(z.string()).default([]),
  gl_doc_path: z.string().optional().nullable(),
  license_doc_path: z.string().optional().nullable(),
  portfolio_photos: z.array(z.string()).optional().default([]),
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = Body.parse(await req.json());

  await supabase.from("users").update({ role: "partner_owner" }).eq("id", user.id);

  let slug = slugify(body.business_name);
  // Append random suffix if collision
  const { data: existing } = await supabase
    .from("partner_profiles")
    .select("slug, user_id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing && existing.user_id !== user.id) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { error } = await supabase.from("partner_profiles").upsert({
    user_id: user.id,
    business_name: body.business_name,
    slug,
    capabilities: body.capabilities,
    years_in_business: parseInt(body.years.replace(/[^0-9]/g, "")) || 0,
    is_founding: body.years.startsWith("10"),
    status: "pending",
    gl_doc_path: body.gl_doc_path ?? null,
    license_doc_path: body.license_doc_path ?? null,
    portfolio_photos: body.portfolio_photos ?? [],
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, slug });
}

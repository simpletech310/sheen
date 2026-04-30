import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  push: z.boolean().optional(),
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = Body.parse(await req.json());
  const update: Record<string, any> = {};
  if (body.push !== undefined) update.notif_push = body.push;
  if (body.email !== undefined) update.notif_email = body.email;
  if (body.sms !== undefined) update.notif_sms = body.sms;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, noop: true });
  }

  const { error } = await supabase.from("users").update(update).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

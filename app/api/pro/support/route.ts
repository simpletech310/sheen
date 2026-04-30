import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  subject: z.string().min(3).max(200),
  body: z.string().min(5).max(4000),
});

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const data = Body.parse(await req.json());

  const { data: row, error } = await supabase
    .from("support_tickets")
    .insert({
      user_id: user.id,
      subject: data.subject,
      body: data.body,
      status: "open",
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Best-effort push to admins. The lib/push module may or may not export
  // a sendPushToRole helper depending on which migration of the push code
  // is running — we cast through unknown so this compiles either way and
  // bails silently when it's missing. Push failures must not block ticket
  // creation.
  try {
    const pushMod = (await import("@/lib/push")) as unknown as {
      sendPushToRole?: (role: string, msg: any) => Promise<unknown>;
    };
    if (typeof pushMod.sendPushToRole === "function") {
      await pushMod.sendPushToRole("admin", {
        title: "New support ticket",
        body: data.subject.slice(0, 80),
        url: "/admin/audit",
        tag: `support-${row.id}`,
      });
    }
  } catch {
    /* swallow */
  }

  return NextResponse.json({ ok: true, id: row.id });
}

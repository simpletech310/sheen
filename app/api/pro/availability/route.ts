import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Recurring = z.object({
  type: z.literal("recurring"),
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string(), // 'HH:MM' or 'HH:MM:SS'
  end_time: z.string(),
});
const Override = z.object({
  type: z.literal("override"),
  specific_date: z.string(), // YYYY-MM-DD
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  blocked: z.boolean().default(false),
});
const Block = z.object({
  type: z.literal("block"),
  specific_date: z.string(),
});

const Body = z.object({
  rules: z.array(z.union([Recurring, Override, Block])),
});

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data } = await supabase
    .from("availability")
    .select("id, day_of_week, specific_date, start_time, end_time, blocked")
    .eq("washer_id", user.id);
  return NextResponse.json({ rules: data ?? [] });
}

/** Replaces all availability rules for the calling washer. Simple PUT-style overwrite.
 *
 *  Surfaces errors from BOTH the delete and the insert — silent
 *  failures here were why "saved" toasts appeared but reloads showed
 *  no rules persisted (RLS or schema-mismatch failures used to fall
 *  through to the 200 ok response).
 */
export async function PUT(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (err: any) {
    return NextResponse.json(
      { error: `Invalid request: ${err.message ?? "schema error"}` },
      { status: 400 }
    );
  }

  const { error: delErr } = await supabase
    .from("availability")
    .delete()
    .eq("washer_id", user.id);
  if (delErr) {
    return NextResponse.json(
      { error: `Couldn't clear old hours: ${delErr.message}` },
      { status: 400 }
    );
  }

  const rows = body.rules.map((r) => {
    if (r.type === "recurring") {
      return {
        washer_id: user.id,
        day_of_week: r.day_of_week,
        start_time: r.start_time,
        end_time: r.end_time,
        blocked: false,
      };
    }
    if (r.type === "override") {
      return {
        washer_id: user.id,
        specific_date: r.specific_date,
        start_time: r.start_time ?? null,
        end_time: r.end_time ?? null,
        blocked: r.blocked,
      };
    }
    return {
      washer_id: user.id,
      specific_date: r.specific_date,
      blocked: true,
    };
  });

  if (rows.length) {
    const { error } = await supabase.from("availability").insert(rows);
    if (error) {
      return NextResponse.json(
        { error: `Couldn't save hours: ${error.message}` },
        { status: 400 }
      );
    }
  }
  return NextResponse.json({ ok: true, saved: rows.length });
}

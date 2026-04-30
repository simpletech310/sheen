import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  // Storage path returned by /api/upload — must include this user's id
  // segment so we know they actually uploaded it.
  doc_path: z.string().min(1).max(512),
  // ISO date string (YYYY-MM-DD or full ISO).
  expires_at: z.string().min(8).max(40),
});

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = Body.parse(await req.json());

  // Path convention from /api/upload: <scope>/<user_id>/<uuid>.<ext>
  // We require the user_id segment to match the caller — defence in depth
  // beyond the storage RLS.
  const segments = body.doc_path.split("/");
  if (segments.length < 3 || segments[1] !== user.id) {
    return NextResponse.json(
      { error: "Document path doesn't belong to you" },
      { status: 400 }
    );
  }

  // Sanity-check expires_at is parseable + in the future.
  const expDate = new Date(body.expires_at);
  if (isNaN(expDate.getTime())) {
    return NextResponse.json({ error: "Invalid expiration date" }, { status: 400 });
  }
  if (expDate.getTime() < Date.now()) {
    return NextResponse.json(
      { error: "Insurance is already expired" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("washer_profiles")
    .update({
      insurance_doc_url: body.doc_path,
      insurance_expires_at: expDate.toISOString(),
    })
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Audit so admin sees it appear in /admin/audit.
  await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: "washer.insurance_uploaded",
    target_type: "washer_profile",
    target_id: user.id,
    payload: {
      doc_path: body.doc_path,
      expires_at: expDate.toISOString(),
    },
  });

  return NextResponse.json({ ok: true });
}

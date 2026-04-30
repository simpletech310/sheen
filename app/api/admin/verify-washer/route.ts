import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  user_id: z.string().uuid(),
  verified: z.boolean(),
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const body = Body.parse(await req.json());

  const { error } = await auth.service
    .from("washer_profiles")
    .update({
      background_check_verified: body.verified,
      background_check_verified_at: body.verified ? new Date().toISOString() : null,
      background_check_verified_by: body.verified ? auth.user.id : null,
      background_check_status: body.verified ? "verified" : "pending",
    })
    .eq("user_id", body.user_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await auth.service.from("audit_log").insert({
    actor_id: auth.user.id,
    action: body.verified ? "washer.verify" : "washer.unverify",
    target_type: "washer_profile",
    target_id: body.user_id,
    payload: {},
  });

  return NextResponse.json({ ok: true });
}

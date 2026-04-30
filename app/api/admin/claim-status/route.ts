import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  claim_id: z.string().uuid(),
  status: z.enum(["open", "approved", "denied", "paid", "disputed"]),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  const ok = await requireAdmin();
  if ("error" in ok) return ok.error;
  const body = Body.parse(await req.json());

  await ok.service
    .from("damage_claims")
    .update({
      status: body.status,
      resolution_notes: body.notes ?? null,
      resolved_by: ok.user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", body.claim_id);

  await logAdminAction({
    actorId: ok.user.id,
    action: "claim_status_change",
    targetType: "damage_claim",
    targetId: body.claim_id,
    payload: { status: body.status },
  });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  action: z.enum(["apply", "waive", "dispute"]),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const body = Body.parse(await req.json());

  const updates: Record<string, any> =
    body.action === "apply"
      ? { status: "applied", applied_at: new Date().toISOString(), applied_by: auth.user.id, waived_at: null, waived_by: null }
      : body.action === "waive"
      ? { status: "waived", waived_at: new Date().toISOString(), waived_by: auth.user.id }
      : { status: "disputed" };

  const { error } = await auth.service
    .from("penalties")
    .update(updates)
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAdminAction({
    actorId: auth.user.id,
    action: `penalty.${body.action}`,
    targetType: "penalty",
    targetId: params.id,
  });

  return NextResponse.json({ ok: true });
}

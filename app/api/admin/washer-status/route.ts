import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  user_id: z.string().uuid(),
  status: z.enum(["pending", "active", "suspended"]),
});

export async function POST(req: Request) {
  const ok = await requireAdmin();
  if ("error" in ok) return ok.error;
  const body = Body.parse(await req.json());

  // Block activation of an unverified pro to keep the marketplace honest.
  if (body.status === "active") {
    const { data: wp } = await ok.service
      .from("washer_profiles")
      .select("background_check_verified")
      .eq("user_id", body.user_id)
      .maybeSingle();
    if (!wp?.background_check_verified) {
      return NextResponse.json(
        { error: "Run background check first (Verify button)." },
        { status: 400 }
      );
    }
  }

  await ok.service
    .from("washer_profiles")
    .update({ status: body.status })
    .eq("user_id", body.user_id);

  // Promote to washer role if currently customer
  if (body.status === "active") {
    await ok.service
      .from("users")
      .update({ role: "washer" })
      .eq("id", body.user_id)
      .eq("role", "customer");
  }

  await logAdminAction({
    actorId: ok.user.id,
    action: "washer_status_change",
    targetType: "washer_profile",
    targetId: body.user_id,
    payload: { status: body.status },
  });

  return NextResponse.json({ ok: true });
}

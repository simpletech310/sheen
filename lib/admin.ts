import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** Resolves the calling user, ensures they have role='admin', and returns
 *  both a service-role client (for unrestricted writes/queries) and the user. */
export async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Admin only" }, { status: 403 }) };
  }
  return { service: createServiceClient(), user };
}

export async function logAdminAction(opts: {
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  payload?: Record<string, unknown>;
}) {
  const supa = createServiceClient();
  await supa.from("audit_log").insert({
    actor_id: opts.actorId,
    action: opts.action,
    target_type: opts.targetType ?? null,
    target_id: opts.targetId ?? null,
    payload: opts.payload ?? {},
  });
}

import { createClient } from "@/lib/supabase/server";

const TIER_RANK: Record<string, number> = {
  express: 1,
  full: 2,
  premium: 3,
  showroom: 4,
};

function tierKeyFromName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("express")) return "express";
  if (n.includes("full")) return "full";
  if (n.includes("premium")) return "premium";
  if (n.includes("showroom")) return "showroom";
  return "express";
}

export type AllowanceState = {
  membershipId: string | null;
  remaining: number;
  totalIncluded: number;
  maxTier: string;
  canCoverTier: boolean;
  planTier: string | null;
};

/** Look up the calling user's active membership and figure out whether the
 *  given service tier is covered by their allowance for the current period. */
export async function getAllowance(userId: string, serviceTierName: string): Promise<AllowanceState> {
  const supabase = createClient();
  const { data: m } = await supabase
    .from("memberships")
    .select("id, washes_used, current_period_end, membership_plans(tier, included_washes, max_service_tier)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!m) {
    return {
      membershipId: null,
      remaining: 0,
      totalIncluded: 0,
      maxTier: "none",
      canCoverTier: false,
      planTier: null,
    };
  }

  const plan = (m as any).membership_plans;
  const totalIncluded = plan?.included_washes ?? 0;
  const remaining = Math.max(0, totalIncluded - (m.washes_used ?? 0));

  const requestedRank = TIER_RANK[tierKeyFromName(serviceTierName)] ?? 1;
  const maxRank = TIER_RANK[plan?.max_service_tier ?? "express"] ?? 1;
  const canCoverTier = requestedRank <= maxRank && remaining > 0;

  return {
    membershipId: m.id,
    remaining,
    totalIncluded,
    maxTier: plan?.max_service_tier ?? "express",
    canCoverTier,
    planTier: plan?.tier ?? null,
  };
}

/** Decrement washes_used after a booking that's covered by the allowance. */
export async function consumeAllowance(membershipId: string) {
  const supabase = createClient();
  const { data: m } = await supabase
    .from("memberships")
    .select("washes_used")
    .eq("id", membershipId)
    .maybeSingle();
  await supabase
    .from("memberships")
    .update({ washes_used: (m?.washes_used ?? 0) + 1 })
    .eq("id", membershipId);
}

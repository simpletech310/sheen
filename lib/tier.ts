// Washer tier ladder. Functional, not cosmetic — this gates which
// add-ons a pro can claim AND drives the progress UI on /pro/me + /wash.
//
// Source of truth for the tier itself is washer_profiles.tier (DB),
// recomputed by the recompute_washer_tier() function on every booking
// completion + every rating change. This file holds the same logic
// in TS so the client can preview "you'll unlock X at the next tier"
// without round-tripping the DB.
//
// If you change a threshold, change the SQL function in
// migration 0032_addons_and_tier_ladder.sql too.

export type Tier = "rookie" | "pro" | "elite" | "legend";

export type TierThreshold = {
  tier: Tier;
  jobs: number;
  rating: number;
  // What promotion to this tier unlocks, in human-readable form
  // (used on the marketing /wash page + /pro/me progress card).
  unlocks: string[];
};

export const TIER_THRESHOLDS: TierThreshold[] = [
  {
    tier: "rookie",
    jobs: 0,
    rating: 0,
    unlocks: ["All base wash tiers", "Quick add-ons (tire shine, pet hair, hand wax)"],
  },
  {
    tier: "pro",
    jobs: 10,
    rating: 4.5,
    unlocks: [
      "Interior shampoo, leather, engine bay, clay bar",
      "Headlight restore, ozone treatment",
      "Big-rig undercarriage + cab shampoo",
    ],
  },
  {
    tier: "elite",
    jobs: 50,
    rating: 4.7,
    unlocks: [
      "Ceramic spray seal ($129+)",
      "1-step paint correction ($249+)",
      "Big-rig chrome polish, sleeper deep-clean, ceramic seal",
    ],
  },
  {
    tier: "legend",
    jobs: 150,
    rating: 4.8,
    unlocks: ["2-year ceramic coating ($399+ — longest, highest-paying jobs)"],
  },
];

export function tierRank(tier: Tier): number {
  switch (tier) {
    case "legend":
      return 4;
    case "elite":
      return 3;
    case "pro":
      return 2;
    case "rookie":
    default:
      return 1;
  }
}

export function tierLabel(tier: Tier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

// Mirrors recompute_washer_tier() in migration 0032. A pro with a
// sub-threshold rating stays at the highest tier whose rating gate
// they clear — so 200 jobs at 4.6 lands as Pro, not Legend.
export function computeTier(jobsCompleted: number, ratingAvg: number | null): Tier {
  const rating = ratingAvg ?? 5.0;
  if (jobsCompleted >= 150 && rating >= 4.8) return "legend";
  if (jobsCompleted >= 50 && rating >= 4.7) return "elite";
  if (jobsCompleted >= 10 && rating >= 4.5) return "pro";
  return "rookie";
}

export type TierProgress = {
  current: Tier;
  next: Tier | null;
  // Specific gap to next tier — null when already at the top OR when
  // the gating factor is rating (we can't tell a pro "do 0 more jobs",
  // we tell them "keep your rating above 4.7").
  jobsNeeded: number | null;
  ratingNeeded: number | null;
  unlocksAtNext: string[];
};

export function tierProgress(
  jobsCompleted: number,
  ratingAvg: number | null
): TierProgress {
  const current = computeTier(jobsCompleted, ratingAvg);
  const currentIdx = TIER_THRESHOLDS.findIndex((t) => t.tier === current);
  const next = TIER_THRESHOLDS[currentIdx + 1];
  if (!next) {
    return {
      current,
      next: null,
      jobsNeeded: null,
      ratingNeeded: null,
      unlocksAtNext: [],
    };
  }
  const rating = ratingAvg ?? 5.0;
  const jobsNeeded = Math.max(0, next.jobs - jobsCompleted);
  const ratingShort = rating < next.rating;
  return {
    current,
    next: next.tier,
    jobsNeeded: jobsNeeded > 0 ? jobsNeeded : null,
    ratingNeeded: ratingShort ? next.rating : null,
    unlocksAtNext: next.unlocks,
  };
}

export function tierUnlocks(tier: Tier): string[] {
  return TIER_THRESHOLDS.find((t) => t.tier === tier)?.unlocks ?? [];
}

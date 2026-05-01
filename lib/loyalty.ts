import { createServiceClient } from "@/lib/supabase/server";

/**
 * Award points to a user (positive = earn, negative = redeem) and emit a
 * loyalty_ledger row. Returns the user's new running balance.
 */
export async function awardPoints(opts: {
  userId: string;
  points: number;
  reason: string;
  bookingId?: string;
}) {
  const supa = createServiceClient();
  await supa.from("loyalty_ledger").insert({
    user_id: opts.userId,
    points: opts.points,
    reason: opts.reason,
    booking_id: opts.bookingId ?? null,
  });
  const { data } = await supa
    .from("loyalty_ledger")
    .select("points")
    .eq("user_id", opts.userId);
  return (data ?? []).reduce((acc, r: any) => acc + (r.points ?? 0), 0);
}

/** Convenience: 1 point per $1 of service. */
export function pointsForService(serviceCents: number) {
  return Math.floor(serviceCents / 100);
}

// Side effects unlocked alongside the achievement insert. Each function takes
// the service-role supabase client so we can write across RLS, and is keyed
// off the achievement id we just inserted. Idempotent: re-running the
// evaluator after the unlock won't re-grant because `have.has(id)` short-
// circuits before reaching this map.
type SideEffect = (
  supa: ReturnType<typeof createServiceClient>,
  userId: string
) => Promise<void>;

const SIDE_EFFECTS: Record<string, SideEffect> = {
  // 5% off forever — composes via greatest-wins so it doesn't stack with Ride or Die.
  founder: async (supa, userId) => {
    await upsertPerk(supa, userId, { discount_pct: 5, is_founder: true });
  },
  ride_or_die: async (supa, userId) => {
    await upsertPerk(supa, userId, { discount_pct: 5 });
    // Annual free Showroom — issue one credit now; the cron-ish renewal of
    // this perk on each anniversary is a follow-up (not in scope).
    await issueCredit(supa, userId, "Showroom", "auto", "ride_or_die");
  },
  comeback_kid: async (supa, userId) => {
    await upsertPerk(supa, userId, { discount_pct: 4 });
  },
  loyal_local: async (supa, userId) => {
    await upsertPerk(supa, userId, { has_lifetime_express_upgrade: true });
  },
  weekend_warrior: async (supa, userId) => {
    await upsertPerk(supa, userId, { weekend_priority: true });
  },
  squad_captain: async (supa, userId) => {
    await issueCredit(supa, userId, "Showroom", "auto", "squad_captain");
  },
  block_boss: async (_supa, _userId) => {
    // 1 yr free Sheen+ Basic — needs the membership grant flow which lives
    // in lib/membership.ts. Stubbed for now: the unlock + badge land,
    // ops grants the membership manually until that flow ships.
  },
};

async function upsertPerk(
  supa: ReturnType<typeof createServiceClient>,
  userId: string,
  patch: Partial<{
    discount_pct: number;
    weekend_priority: boolean;
    has_lifetime_express_upgrade: boolean;
    is_founder: boolean;
  }>
) {
  // Read first so we can take max(discount_pct) — we never want a smaller
  // discount to overwrite a larger one already granted.
  const { data: existing } = await supa
    .from("customer_perks")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  const next = {
    user_id: userId,
    discount_pct: Math.max(existing?.discount_pct ?? 0, patch.discount_pct ?? 0),
    weekend_priority: existing?.weekend_priority || !!patch.weekend_priority,
    has_lifetime_express_upgrade:
      existing?.has_lifetime_express_upgrade || !!patch.has_lifetime_express_upgrade,
    is_founder: existing?.is_founder || !!patch.is_founder,
    updated_at: new Date().toISOString(),
  };
  await supa.from("customer_perks").upsert(next, { onConflict: "user_id" });
}

async function issueCredit(
  supa: ReturnType<typeof createServiceClient>,
  userId: string,
  tier: string,
  category: "auto" | "home" | "big_rig",
  source: string
) {
  await supa.from("customer_credits").insert({
    user_id: userId,
    kind: "free_wash",
    service_category: category,
    service_tier_name: tier,
    source_achievement_id: source,
  });
}

/**
 * Inspect the user's history and unlock any achievements they've earned. Idempotent.
 * Returns the list of newly unlocked achievement ids (empty if none).
 */
export async function checkAchievements(userId: string): Promise<string[]> {
  const supa = createServiceClient();

  // Already-unlocked
  const { data: existing } = await supa
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId);
  const have = new Set((existing ?? []).map((r) => r.achievement_id));

  // Booking history (for customer-side counts) — pull what we need for
  // every customer-side trigger in one query.
  const { data: bookings } = await supa
    .from("bookings")
    .select("id, status, completed_at, scheduled_window_start, vehicle_id, services(tier_name)")
    .eq("customer_id", userId);

  const completed = (bookings ?? []).filter((b) => b.status === "completed");
  const now = Date.now();

  // Loyal Local — 10 completed washes within trailing 90 days.
  const last90 = completed.filter(
    (b) => b.completed_at && now - new Date(b.completed_at).getTime() < 90 * 86400 * 1000
  ).length;

  // Weekend Warrior — 10 weekend bookings (any status; "I tried to book"
  // is the customer behaviour we're rewarding).
  const weekendCount = (bookings ?? []).filter((b) => {
    const d = new Date(b.scheduled_window_start);
    const day = d.getDay();
    return day === 0 || day === 6;
  }).length;

  // Hot Wheels — 5 distinct vehicle_class values across washed cars.
  let distinctClasses = 0;
  const vehicleIds = Array.from(
    new Set(completed.map((b) => b.vehicle_id).filter((v): v is string => !!v))
  );
  if (vehicleIds.length > 0) {
    const { data: vehicles } = await supa
      .from("vehicles")
      .select("vehicle_class")
      .in("id", vehicleIds);
    distinctClasses = new Set(
      (vehicles ?? []).map((v: any) => v.vehicle_class).filter(Boolean)
    ).size;
  }

  // Comeback Kid — 5 instances where a booking happened ≤7 days after the
  // previous one. Sort by start time and walk the gap.
  const sorted = [...completed]
    .filter((b) => !!b.completed_at)
    .sort((a, b) => new Date(a.completed_at!).getTime() - new Date(b.completed_at!).getTime());
  let comebackCount = 0;
  for (let i = 1; i < sorted.length; i++) {
    const gap =
      new Date(sorted[i].completed_at!).getTime() -
      new Date(sorted[i - 1].completed_at!).getTime();
    if (gap <= 7 * 86400 * 1000) comebackCount++;
  }

  // Sheen Star — 25 reviews with photos.
  const { count: reviewsWithPhotos } = await supa
    .from("reviews")
    .select("booking_id", { count: "exact", head: true })
    .eq("reviewer_id", userId)
    .eq("has_photo", true);

  // Ride or Die — current active membership older than 12 months.
  const { data: mem } = await supa
    .from("memberships")
    .select("status, created_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const continuousYear =
    !!mem?.created_at &&
    now - new Date(mem.created_at).getTime() >= 365 * 86400 * 1000;

  // Washer-side counts (unchanged from v1)
  const { data: wp } = await supa
    .from("washer_profiles")
    .select("jobs_completed, rating_avg")
    .eq("user_id", userId)
    .maybeSingle();

  const triggers: { id: string; condition: boolean }[] = [
    // Customer — v1 catalog
    { id: "first_wash",           condition: completed.length >= 1 },
    { id: "loyal",                condition: completed.length >= 5 },
    { id: "detailing_fan",        condition: completed.length >= 10 },
    {
      id: "showroom_connoisseur",
      condition: completed.some((b: any) => (b.services?.tier_name ?? "").toLowerCase().includes("showroom")),
    },
    {
      id: "quarterly_regular",
      condition:
        completed.filter(
          (b) => b.completed_at && now - new Date(b.completed_at).getTime() < 30 * 86400 * 1000
        ).length >= 3,
    },
    // Customer — launch playbook (10 from the doc)
    { id: "welcome_wash",     condition: completed.length >= 1 },
    { id: "loyal_local",      condition: last90 >= 10 },
    { id: "ride_or_die",      condition: continuousYear },
    { id: "hot_wheels",       condition: distinctClasses >= 5 },
    { id: "weekend_warrior",  condition: weekendCount >= 10 },
    { id: "sheen_star",       condition: (reviewsWithPhotos ?? 0) >= 25 },
    { id: "comeback_kid",     condition: comebackCount >= 5 },
    // squad_captain (referrals), block_boss (neighbour proximity), and
    // founder (first-N-in-market) require systems we haven't built yet.
    // They unlock via admin grant in /admin until those land.

    // Washer
    { id: "first_job",   condition: (wp?.jobs_completed ?? 0) >= 1 },
    { id: "hundred_club", condition: (wp?.jobs_completed ?? 0) >= 100 },
    { id: "top_rated",    condition: (wp?.jobs_completed ?? 0) >= 50 && (wp?.rating_avg ?? 0) >= 4.9 },
  ];

  const newlyUnlocked: string[] = [];
  for (const t of triggers) {
    if (!have.has(t.id) && t.condition) {
      newlyUnlocked.push(t.id);
    }
  }
  if (newlyUnlocked.length) {
    await supa.from("user_achievements").insert(
      newlyUnlocked.map((id) => ({ user_id: userId, achievement_id: id }))
    );
    // Award bonus points
    const { data: ach } = await supa
      .from("achievements")
      .select("id, bonus_points")
      .in("id", newlyUnlocked);
    for (const a of ach ?? []) {
      if (a.bonus_points && a.bonus_points > 0) {
        await awardPoints({
          userId,
          points: a.bonus_points,
          reason: `achievement:${a.id}`,
        });
      }
    }
    // Apply per-achievement perk grants (discount %, credits, flags).
    for (const id of newlyUnlocked) {
      const fn = SIDE_EFFECTS[id];
      if (fn) {
        try {
          await fn(supa, userId);
        } catch (e) {
          // Don't let one failed perk grant block the whole batch — log + continue.
          console.error(`perk grant failed for ${id}`, e);
        }
      }
    }
  }
  return newlyUnlocked;
}

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

  // Booking history (for customer-side counts)
  const { data: bookings } = await supa
    .from("bookings")
    .select("id, status, completed_at, services(tier_name)")
    .eq("customer_id", userId);

  const completed = (bookings ?? []).filter((b) => b.status === "completed");

  // Washer-side counts
  const { data: wp } = await supa
    .from("washer_profiles")
    .select("jobs_completed, rating_avg")
    .eq("user_id", userId)
    .maybeSingle();

  const triggers: { id: string; condition: boolean }[] = [
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
          (b) => b.completed_at && Date.now() - new Date(b.completed_at).getTime() < 30 * 86400 * 1000
        ).length >= 3,
    },
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
  }
  return newlyUnlocked;
}

/**
 * Rush / ASAP booking math.
 *
 * Customer surcharge is added on top of the trust fee at booking time.
 * Washer bonus is paid IF they arrive before the deadline.
 * If they miss the deadline:
 *   - washer payout drops by RUSH_LATE_WASHER_PENALTY_PCT below normal
 *   - customer is refunded RUSH_LATE_CUSTOMER_REFUND_PCT (so they pay
 *     slightly less than the regular price)
 *   - the rest of the surcharge goes to the platform.
 *
 * All percentages are applied to the base service_cents (pre-surcharge).
 */

export const RUSH_DEADLINE_MIN = 60;

export const RUSH_CUSTOMER_SURCHARGE_PCT = 0.15;
export const RUSH_WASHER_BONUS_PCT = 0.10;
export const RUSH_LATE_WASHER_PENALTY_PCT = 0.05;
export const RUSH_LATE_CUSTOMER_REFUND_PCT = 0.05;

export type RushAmounts = {
  /** Cents added to the customer's charge at booking. */
  customerSurchargeCents: number;
  /** Cents the washer earns on top of base payout if they arrive in time. */
  washerBonusCents: number;
};

/**
 * Compute the up-front rush amounts to write to the booking row.
 * Stored in cents on the booking so future tweaks to the constants
 * don't retroactively change pricing for in-flight jobs.
 */
export function computeRushAmounts(serviceCents: number): RushAmounts {
  return {
    customerSurchargeCents: Math.round(serviceCents * RUSH_CUSTOMER_SURCHARGE_PCT),
    washerBonusCents: Math.round(serviceCents * RUSH_WASHER_BONUS_PCT),
  };
}

/**
 * Resolve rush amounts at payout time. Fed into lib/payout/release so
 * the right transfer + (optional) refund happens.
 *
 * - madeInTime → washer gets bonus, customer keeps the surcharge they
 *   paid (they got what they paid for: a fast wash).
 * - !madeInTime → washer is penalized, customer is refunded a chunk.
 *   The math here is computed once and surfaced as deltas; callers
 *   apply them on top of the normal payout calculation.
 */
export function resolveRushPayoutDeltas(opts: {
  serviceCents: number;
  bonusCents: number;
  madeInTime: boolean;
}): {
  /** Add to the washer's normal cut (negative if late). */
  washerDeltaCents: number;
  /** Refund this much to the customer (always non-negative). */
  customerRefundCents: number;
} {
  if (opts.madeInTime) {
    return { washerDeltaCents: opts.bonusCents, customerRefundCents: 0 };
  }
  const penalty = Math.round(opts.serviceCents * RUSH_LATE_WASHER_PENALTY_PCT);
  const refund = Math.round(opts.serviceCents * RUSH_LATE_CUSTOMER_REFUND_PCT);
  return {
    washerDeltaCents: -penalty,
    customerRefundCents: refund,
  };
}

/**
 * Deadline timestamp. Rush window starts the moment the booking is
 * created — that's when the customer hit "Rush" expecting "within an
 * hour".
 */
export function rushDeadlineFromCreated(createdAtIso: string | Date): string {
  const t = typeof createdAtIso === "string" ? new Date(createdAtIso) : createdAtIso;
  return new Date(t.getTime() + RUSH_DEADLINE_MIN * 60 * 1000).toISOString();
}

/**
 * Was the pro on time? Treat the earlier of arrived_at or started_at
 * as "they were here" (since check-in proves presence too).
 */
export function arrivedInTime(opts: {
  rushDeadline: string | Date;
  arrivedAt?: string | Date | null;
  startedAt?: string | Date | null;
}): boolean {
  const deadline =
    typeof opts.rushDeadline === "string"
      ? new Date(opts.rushDeadline).getTime()
      : opts.rushDeadline.getTime();
  const arrived = opts.arrivedAt
    ? typeof opts.arrivedAt === "string"
      ? new Date(opts.arrivedAt).getTime()
      : opts.arrivedAt.getTime()
    : null;
  const started = opts.startedAt
    ? typeof opts.startedAt === "string"
      ? new Date(opts.startedAt).getTime()
      : opts.startedAt.getTime()
    : null;
  const earliest = Math.min(arrived ?? Infinity, started ?? Infinity);
  if (!Number.isFinite(earliest)) return false;
  return earliest <= deadline;
}

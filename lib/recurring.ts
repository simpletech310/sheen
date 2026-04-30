// Helpers for the recurring-booking feature.

export const FREQ_DAYS: Record<"weekly" | "biweekly" | "monthly", number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30, // approximate — close enough for "every month"
};

/** Compute the next run date given a frequency and the last run. */
export function nextRunDate(
  frequency: "weekly" | "biweekly" | "monthly",
  lastRun: Date
): Date {
  const out = new Date(lastRun);
  out.setDate(out.getDate() + FREQ_DAYS[frequency]);
  return out;
}

/**
 * The booking flow uses simple window keys like "tomorrow_10_12". For
 * recurring templates we store the same shape but interpret it relative
 * to the next_run_at date — i.e. the day-of-week and hours just say "10–12
 * on whatever date the cron picks."
 *
 * Returns the date-aware start/end for a window key + a target date.
 */
export function applyWindowToDate(windowKey: string, target: Date): { start: Date; end: Date } {
  const parts = windowKey.split("_");
  // "today_14_16" → use the hours, ignore the day prefix (we already know
  // the date). "tomorrow_10_12" → same.
  const hStart = Number(parts[parts.length - 2] ?? 10);
  const hEnd = Number(parts[parts.length - 1] ?? 12);
  const start = new Date(target);
  start.setHours(hStart, 0, 0, 0);
  const end = new Date(target);
  end.setHours(hEnd, 0, 0, 0);
  return { start, end };
}

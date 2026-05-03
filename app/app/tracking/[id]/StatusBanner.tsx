"use client";

import { useEffect, useState } from "react";

// Visual status banner with a 5-step progress timeline so the customer
// can see where their booking is in the flow at a glance — no more
// guessing whether "matched" means a pro is on the way or just claimed.
//
// Statuses we surface (booking row's status enum):
//   pending           → Awaiting a pro
//   matched           → Pro claimed, en route
//   in_progress       → Wash underway
//   completed         → Done · awaiting your approval
//   funded            → Approved · pro paid
//   cancelled         → Cancelled
//
// `arrivedAt` (if set) bumps "Matched" to "On site" without changing
// the underlying status — pro hit "I'm here" but hasn't started yet.

type Step = { key: string; label: string };

const STEPS: Step[] = [
  { key: "booked", label: "Booked" },
  { key: "matched", label: "Matched" },
  { key: "on_site", label: "On site" },
  { key: "in_progress", label: "Washing" },
  { key: "completed", label: "Done" },
  { key: "funded", label: "Funded" },
];

function statusToStep(status: string, arrivedAt: string | null): number {
  if (status === "cancelled") return -1;
  if (status === "funded") return 5;
  if (status === "completed") return 4;
  if (status === "in_progress") return 3;
  if (status === "matched") return arrivedAt ? 2 : 1;
  return 0; // pending
}

export function StatusBanner({
  initialStatus,
  arrivedAt,
  scheduledStart,
  scheduledEnd,
  isRush,
  rushDeadline,
}: {
  initialStatus: string;
  arrivedAt: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  isRush: boolean;
  rushDeadline: string | null;
}) {
  const stepIdx = statusToStep(initialStatus, arrivedAt);
  const cancelled = stepIdx < 0;

  // Live countdown on rush jobs so the customer (and pro, who sees
  // the same info) knows exactly how long until the deadline.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isRush || !rushDeadline) return;
    const i = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(i);
  }, [isRush, rushDeadline]);

  const minsLeft = isRush && rushDeadline
    ? Math.max(0, Math.ceil((new Date(rushDeadline).getTime() - now) / 60_000))
    : null;

  const start = new Date(scheduledStart);
  const end = new Date(scheduledEnd);
  const dayLabel = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const tStart = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const tEnd = end.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <div
      className={`relative overflow-hidden p-5 mb-5 ${
        cancelled
          ? "bg-bad/10 border-l-2 border-bad"
          : isRush
          ? "bg-sol/15 border-l-2 border-sol"
          : "bg-royal text-bone"
      }`}
    >
      {!cancelled && !isRush && <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />}

      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="font-mono text-[10px] uppercase tracking-wider opacity-75">
          {cancelled
            ? "Cancelled"
            : isRush
            ? minsLeft != null && minsLeft > 0
              ? `Rush · pro on the way · ${minsLeft} min left`
              : "Rush · pro is on it"
            : STEPS[stepIdx].label}
        </div>
        {isRush && (
          <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-sol text-ink">
            ASAP
          </span>
        )}
      </div>

      <div className="display text-2xl mb-1">{dayLabel}</div>
      <div className="text-sm opacity-90">
        {tStart} – {tEnd}
      </div>

      {!cancelled && (
        <div className="mt-5">
          <div className="flex justify-between gap-1">
            {STEPS.slice(0, 6).map((s, i) => {
              const done = i <= stepIdx;
              const current = i === stepIdx;
              return (
                <div key={s.key} className="flex-1 min-w-0 text-center">
                  <div
                    className={`h-1.5 mb-1.5 ${
                      done
                        ? isRush
                          ? "bg-sol"
                          : "bg-sol"
                        : isRush
                        ? "bg-ink/15"
                        : "bg-bone/20"
                    }`}
                  />
                  <div
                    className={`font-mono text-[9px] uppercase tracking-wider truncate ${
                      current
                        ? isRush
                          ? "text-ink font-bold"
                          : "text-sol font-bold"
                        : done
                        ? isRush
                          ? "text-ink/85"
                          : "text-bone/85"
                        : isRush
                        ? "text-ink/40"
                        : "text-bone/40"
                    }`}
                  >
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

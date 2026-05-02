"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Props = {
  bookingId: string;
  status: string;
  tierName: string;
  category: "auto" | "home" | "commercial";
  scheduledAt: string;
  addressLine: string | null;
  proName: string | null;
  proInitial: string | null;
  proAvatarUrl: string | null;
  proRating: number | null;
  vehicleCount: number;
  total: string; // formatted USD
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting pro",
  matched: "Pro matched",
  en_route: "On the way",
  arrived: "Arrived",
  in_progress: "Cleaning",
  completed: "Completed",
};

function formatCountdown(diffMs: number) {
  if (diffMs <= 0) return "Starting soon";
  const totalMin = Math.round(diffMs / 60000);
  if (totalMin < 60) return `in ${totalMin} min`;
  const hrs = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (hrs < 24) return min > 0 ? `in ${hrs}h ${min}m` : `in ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "tomorrow" : `in ${days} days`;
}

export function NextWashHero(props: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const scheduledMs = new Date(props.scheduledAt).getTime();
  const isLive = ["en_route", "arrived", "in_progress", "matched"].includes(props.status);
  const isPending = props.status === "pending";
  const countdown = formatCountdown(scheduledMs - now);
  const trackingUrl = `/app/tracking/${props.bookingId}`;
  const detailUrl = `/app/washes/${props.bookingId}`;

  return (
    <Link
      href={isLive || isPending ? trackingUrl : detailUrl}
      className="block relative overflow-hidden bg-ink text-bone hover:bg-ink/90 transition group"
    >
      {/* Sol-gold accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />

      <div className="relative px-5 pt-6 pb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isLive ? "bg-sol animate-pulse" : "bg-bone/40"
              }`}
              aria-hidden
            />
            <span className="font-mono text-[10px] uppercase tracking-wider text-sol">
              Next wash · {STATUS_LABEL[props.status] ?? props.status}
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-bone/60 tabular">
            {countdown}
          </span>
        </div>

        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="display text-2xl leading-tight">
              {props.tierName}
              {props.vehicleCount > 1 && (
                <span className="ml-2 text-sol text-base font-mono tracking-wider">
                  × {props.vehicleCount}
                </span>
              )}
            </h2>
            {props.addressLine && (
              <div className="text-xs text-bone/70 mt-1 truncate">{props.addressLine}</div>
            )}
            <div className="text-xs text-bone/60 mt-1 font-mono tabular">
              {new Date(props.scheduledAt).toLocaleString([], {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="display tabular text-2xl">{props.total}</div>
          </div>
        </div>

        {props.proName && (
          <div className="mt-4 pt-4 border-t border-bone/15 flex items-center gap-3">
            {props.proAvatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={props.proAvatarUrl}
                alt={props.proName}
                className="w-9 h-9 rounded-full object-cover bg-royal shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-royal text-bone flex items-center justify-center display text-base shrink-0">
                {props.proInitial ?? "P"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{props.proName}</div>
              {props.proRating != null && (
                <div className="text-xs text-bone/70 mt-0.5">
                  <span className="text-sol">★</span> {props.proRating.toFixed(1)}
                </div>
              )}
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-bone/60 group-hover:text-sol transition">
              {isLive ? "Track →" : "View →"}
            </span>
          </div>
        )}

        {!props.proName && (
          <div className="mt-4 pt-4 border-t border-bone/15 flex justify-between items-center">
            <span className="text-xs text-bone/70">Matching you with a pro nearby…</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-bone/60 group-hover:text-sol transition">
              Track →
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

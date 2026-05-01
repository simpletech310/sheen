"use client";

import { useState } from "react";
import Link from "next/link";
import { fmtUSD } from "@/lib/pricing";

const STATUS_COLOR: Record<string, string> = {
  completed: "bg-good",
  en_route: "bg-royal",
  arrived: "bg-royal",
  in_progress: "bg-sol",
  pending: "bg-smoke",
  matched: "bg-royal",
  cancelled: "bg-bad",
  disputed: "bg-bad",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting pro",
  matched: "Pro matched",
  en_route: "On the way",
  arrived: "Arrived",
  in_progress: "Cleaning",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Under review",
};

type FilterTab = "active" | "completed" | "cancelled";

const ACTIVE_STATUSES = ["pending", "matched", "en_route", "arrived", "in_progress"];

export type Booking = {
  id: string;
  status: string;
  total_cents: number;
  scheduled_window_start: string;
  services: { tier_name: string } | null;
};

export function WashesFilterClient({
  bookings,
  completedCount,
  upcomingCount,
  points,
}: {
  bookings: Booking[];
  completedCount: number;
  upcomingCount: number;
  points: number;
}) {
  const [tab, setTab] = useState<FilterTab>("active");

  const filtered = bookings.filter((b) => {
    if (tab === "active") return ACTIVE_STATUSES.includes(b.status);
    if (tab === "completed") return b.status === "completed";
    if (tab === "cancelled") return ["cancelled", "disputed"].includes(b.status);
    return true;
  });

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "active", label: "Active", count: upcomingCount },
    { key: "completed", label: "Completed", count: completedCount },
    {
      key: "cancelled",
      label: "Cancelled",
      count: bookings.filter((b) => ["cancelled", "disputed"].includes(b.status)).length,
    },
  ];

  return (
    <>
      {/* Quick stats strip */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="bg-mist/40 p-3">
          <div className="font-mono text-[9px] uppercase tracking-wider text-smoke">Upcoming</div>
          <div className="display tabular text-2xl mt-1">{upcomingCount}</div>
        </div>
        <div className="bg-mist/40 p-3">
          <div className="font-mono text-[9px] uppercase tracking-wider text-smoke">Completed</div>
          <div className="display tabular text-2xl mt-1">{completedCount}</div>
        </div>
        <Link href="/app/wallet" className="bg-royal text-bone p-3 hover:bg-ink transition">
          <div className="font-mono text-[9px] uppercase tracking-wider text-sol">Loyalty</div>
          <div className="display tabular text-2xl mt-1">
            {points.toLocaleString()}<span className="text-xs ml-1 opacity-80">pts</span>
          </div>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 text-center text-xs font-bold uppercase tracking-wide transition ${
              tab === t.key
                ? "bg-royal text-bone"
                : "bg-mist/40 text-smoke hover:bg-mist"
            }`}
          >
            {t.label}
            <span className="ml-1.5 opacity-70">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Bookings list */}
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((b) => {
            const stripe = STATUS_COLOR[b.status] ?? "bg-smoke";
            const label = STATUS_LABEL[b.status] ?? b.status.replace(/_/g, " ");
            const isLive = ACTIVE_STATUSES.includes(b.status);
            return (
              <Link
                key={b.id}
                href={isLive ? `/app/tracking/${b.id}` : `/app/washes/${b.id}`}
                className="relative block bg-mist/40 hover:bg-mist transition p-4 pl-5 group"
              >
                <span className={`absolute left-0 top-0 bottom-0 w-1 ${stripe}`} />
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-semibold">{b.services?.tier_name ?? "Wash"}</div>
                    <div className="text-xs text-smoke mt-1">
                      {new Date(b.scheduled_window_start).toLocaleDateString([], {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                      {" · "}
                      {new Date(b.scheduled_window_start).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="display tabular text-lg">{fmtUSD(b.total_cents)}</div>
                    <div className="font-mono text-[10px] text-smoke uppercase tracking-wider mt-0.5">
                      {label}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-mist/40 p-6 text-center">
          <div className="font-mono text-[10px] uppercase tracking-wider text-smoke mb-1">
            {tab === "active" ? "No active washes" : tab === "completed" ? "No completed washes yet" : "No cancelled washes"}
          </div>
          {tab === "active" && (
            <Link
              href="/app/book"
              className="inline-block mt-3 bg-sol text-ink px-5 py-2.5 text-xs font-bold uppercase tracking-wide hover:bg-bone transition"
            >
              Book a wash →
            </Link>
          )}
        </div>
      )}
    </>
  );
}

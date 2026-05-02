"use client";

import { useState } from "react";
import Link from "next/link";
import { fmtUSD } from "@/lib/pricing";
import { useTranslations } from "next-intl";

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

type FilterTab = "active" | "completed" | "approved" | "cancelled";

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
  approvedCount,
  upcomingCount,
  points,
  page,
  totalPages,
  sort,
}: {
  bookings: Booking[];
  // Completed = washer marked done, customer hasn't approved yet (action
  // required from the customer to release funds).
  completedCount: number;
  // Approved = customer hit Approve → release.ts ran → status='funded'.
  approvedCount: number;
  upcomingCount: number;
  points: number;
  page: number;
  totalPages: number;
  sort: string;
}) {
  const t = useTranslations("appWashes");
  const [tab, setTab] = useState<FilterTab>("active");

  const sortHref = (s: string) => `?sort=${s}`;
  const pageHref = (p: number) => `?sort=${sort}&page=${p}`;

  const STATUS_LABEL: Record<string, string> = {
    pending: t("statusPending"),
    matched: t("statusMatched"),
    en_route: t("statusEnRoute"),
    arrived: t("statusArrived"),
    in_progress: t("statusInProgress"),
    completed: t("statusCompleted"),
    funded: t("statusFunded"),
    cancelled: t("statusCancelled"),
    disputed: t("statusDisputed"),
  };

  const filtered = bookings.filter((b) => {
    if (tab === "active") return ACTIVE_STATUSES.includes(b.status);
    // status='completed' means washer is done but customer hasn't yet
    // approved — funds still in escrow, customer action required.
    if (tab === "completed") return b.status === "completed";
    // status='funded' means the customer approved and funds released.
    if (tab === "approved") return b.status === "funded";
    if (tab === "cancelled") return ["cancelled", "disputed"].includes(b.status);
    return true;
  });

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "active", label: t("tabActive"), count: upcomingCount },
    { key: "completed", label: t("tabCompleted"), count: completedCount },
    { key: "approved", label: t("tabApproved"), count: approvedCount },
    {
      key: "cancelled",
      label: t("tabCancelled"),
      count: bookings.filter((b) => ["cancelled", "disputed"].includes(b.status)).length,
    },
  ];

  return (
    <>
      {/* Quick stats strip */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="bg-mist/40 p-3">
          <div className="font-mono text-[9px] uppercase tracking-wider text-smoke">{t("statUpcoming")}</div>
          <div className="display tabular text-2xl mt-1">{upcomingCount}</div>
        </div>
        <div className="bg-mist/40 p-3">
          <div className="font-mono text-[9px] uppercase tracking-wider text-smoke">{t("statCompleted")}</div>
          <div className="display tabular text-2xl mt-1">{completedCount}</div>
        </div>
        <Link href="/app/wallet" className="bg-royal text-bone p-3 hover:bg-ink transition">
          <div className="font-mono text-[9px] uppercase tracking-wider text-sol">{t("statLoyalty")}</div>
          <div className="display tabular text-2xl mt-1">
            {points.toLocaleString()}<span className="text-xs ml-1 opacity-80">{t("pts")}</span>
          </div>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto -mx-1 px-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide transition ${
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

      {/* Sort dropdown — controls how the *paginated* list is ordered. The
          tab filter above still narrows the visible rows on the current page. */}
      <div className="flex items-center justify-between mb-4 text-xs">
        <span className="font-mono text-[10px] uppercase tracking-wider text-smoke">{t("sortLabel")}</span>
        <div className="flex gap-1 flex-wrap">
          {([
            ["date_desc", t("sortNewest")],
            ["date_asc", t("sortOldest")],
            ["amount_desc", t("sortMostSpent")],
            ["amount_asc", t("sortLeastSpent")],
          ] as [string, string][]).map(([k, label]) => (
            <Link
              key={k}
              href={sortHref(k)}
              className={`px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${
                sort === k ? "bg-royal text-bone" : "bg-mist/40 text-smoke hover:bg-mist"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
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
                    <div className="text-sm font-semibold">{b.services?.tier_name ?? t("defaultWashName")}</div>
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
            {tab === "active"
              ? t("emptyActive")
              : tab === "completed"
              ? t("emptyCompleted")
              : tab === "approved"
              ? t("emptyApproved")
              : t("emptyCancelled")}
          </div>
          {tab === "active" && (
            <Link
              href="/app/book"
              className="inline-block mt-3 bg-sol text-ink px-5 py-2.5 text-xs font-bold uppercase tracking-wide hover:bg-bone transition"
            >
              {t("bookCta")}
            </Link>
          )}
        </div>
      )}

      {/* Page navigation — only shown when there's more than one page. */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="px-3 py-2 text-xs font-bold uppercase tracking-wide bg-mist/40 hover:bg-mist transition"
            >
              {t("pageNewer")}
            </Link>
          ) : (
            <span />
          )}
          <span className="font-mono text-[10px] uppercase tracking-wider text-smoke tabular">
            {t("pageOf", { page, total: totalPages })}
          </span>
          {page < totalPages ? (
            <Link
              href={pageHref(page + 1)}
              className="px-3 py-2 text-xs font-bold uppercase tracking-wide bg-mist/40 hover:bg-mist transition"
            >
              {t("pageOlder")}
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </>
  );
}

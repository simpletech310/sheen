"use client";

import { useState } from "react";
import Link from "next/link";
import { fmtUSD } from "@/lib/pricing";
import { computeFees } from "@/lib/stripe/fees";

type FilterTab = "active" | "completed" | "cancelled";

const ACTIVE_STATUSES = ["matched", "en_route", "arrived", "in_progress"];

export type ProJob = {
  id: string;
  status: string;
  scheduled_window_start: string;
  service_cents: number;
  services: { tier_name: string; category: string } | null;
  addresses: { street: string; city: string } | null;
};

export function ProJobsFilterClient({
  jobs,
}: {
  jobs: ProJob[];
}) {
  const [tab, setTab] = useState<FilterTab>("active");

  const filtered = jobs.filter((j) => {
    if (tab === "active") return ACTIVE_STATUSES.includes(j.status);
    if (tab === "completed") return j.status === "completed" || j.status === "funded";
    if (tab === "cancelled") return ["cancelled", "disputed"].includes(j.status);
    return true;
  });

  const counts = {
    active: jobs.filter((j) => ACTIVE_STATUSES.includes(j.status)).length,
    completed: jobs.filter((j) => j.status === "completed" || j.status === "funded").length,
    cancelled: jobs.filter((j) => ["cancelled", "disputed"].includes(j.status)).length,
  };

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "active", label: "Active", count: counts.active },
    { key: "completed", label: "Completed", count: counts.completed },
    { key: "cancelled", label: "Cancelled", count: counts.cancelled },
  ];

  return (
    <>
      <div className="flex gap-1 mb-5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 text-center text-xs font-bold uppercase tracking-wide transition ${
              tab === t.key
                ? "bg-royal text-bone"
                : "bg-white/5 text-bone/50 hover:bg-white/10 hover:text-bone"
            }`}
          >
            {t.label}
            <span className="ml-1.5 opacity-70">{t.count}</span>
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((j) => {
            const winStart = new Date(j.scheduled_window_start);
            const minsAway = Math.round((winStart.getTime() - Date.now()) / 60_000);
            const isActive = ACTIVE_STATUSES.includes(j.status);
            
            // If completed, we show a basic view, if active we link to navigate
            return (
              <Link
                key={j.id}
                href={isActive ? `/pro/jobs/${j.id}/navigate` : "#"}
                className={`block p-4 border-l-2 transition ${
                  isActive
                    ? "bg-white/5 hover:bg-white/10 border-royal"
                    : "bg-white/5 border-bone/20 opacity-80"
                }`}
                style={{ pointerEvents: isActive ? "auto" : "none" }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-bold uppercase">
                      {j.services?.tier_name ?? "Service"}
                    </div>
                    <div className="text-xs text-bone/90 mt-1">
                      {j.addresses?.street}, {j.addresses?.city}
                    </div>
                    <div className="font-mono text-[10px] text-bone/75 uppercase mt-1.5 tabular">
                      {winStart.toLocaleDateString([], { month: "short", day: "numeric" })}
                      {" · "}
                      {winStart.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      {isActive && minsAway > 0 && minsAway < 240 && (
                        <span className="text-sol ml-2">
                          in {minsAway < 60 ? `${minsAway} min` : `${Math.round(minsAway / 60)}h`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="display tabular text-xl text-sol">
                      {fmtUSD(
                        computeFees({
                          serviceCents: j.service_cents,
                          routedTo: "solo_washer", // Always solo washer context here
                        }).washerOrPartnerNet
                      )}
                    </div>
                    <div className="font-mono text-[10px] text-bone/75">
                      {j.status === "completed" || j.status === "funded" ? "EARNED" : "YOU GET"}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-white/5 p-6 text-center border-l-2 border-bone/20">
          <div className="font-mono text-[10px] uppercase tracking-wider text-bone/50">
            {tab === "active" ? "No active jobs" : tab === "completed" ? "No completed jobs yet" : "No cancelled jobs"}
          </div>
        </div>
      )}
    </>
  );
}

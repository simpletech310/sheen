"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { fmtUSD } from "@/lib/pricing";
import { computeFees } from "@/lib/stripe/fees";

/**
 * Real-time queue list. Receives an initial snapshot from the server
 * component (zero extra latency) then subscribes to Supabase Realtime
 * postgres_changes for the bookings table — no polling.
 *
 * Events handled:
 *   INSERT  → new job, add to list if it passes basic filters
 *   UPDATE  → job claimed / cancelled / changed — remove from list
 *   DELETE  → remove from list
 *
 * Radius + availability filtering is server-side on initial load.
 * Realtime events get basic client-side filtering (status=pending,
 * no assigned washer). Availability windows are not re-evaluated on
 * realtime events — that's acceptable: pros can always open the
 * job detail and see if it actually fits their schedule.
 */

export type QueueJob = {
  id: string;
  status: string;
  assigned_washer_id: string | null;
  scheduled_window_start: string;
  service_cents: number;
  vehicle_count: number;
  requested_washer_id: string | null;
  request_expires_at: string | null;
  is_rush: boolean;
  rush_deadline: string | null;
  rush_bonus_cents: number;
  services: { tier_name: string; category: string } | null;
  addresses: { street: string; city: string; lat: number | null; lng: number | null } | null;
};

function distanceMilesSimple(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function QueueRealtimeClient({
  initialJobs,
  initialDirectRequests,
  userId,
  myLat,
  myLng,
  radius,
  canWashBigRig,
}: {
  initialJobs: QueueJob[];
  initialDirectRequests: QueueJob[];
  userId: string;
  myLat: number | null;
  myLng: number | null;
  radius: number;
  canWashBigRig: boolean;
}) {
  const [jobs, setJobs] = useState<QueueJob[]>(initialJobs);
  const [directRequests, setDirectRequests] = useState<QueueJob[]>(initialDirectRequests);
  // Track which IDs are direct requests so we don't show them in the general list
  const directIds = useRef(new Set(initialDirectRequests.map((j) => j.id)));

  // Flash animation: IDs of newly arrived jobs
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = supabase
      .channel("queue:bookings")
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "bookings",
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as any).id as string;
            setJobs((prev) => prev.filter((j) => j.id !== id));
            setDirectRequests((prev) => prev.filter((j) => j.id !== id));
            directIds.current.delete(id);
            return;
          }

          const row = payload.new as any;

          // Only care about pending, unclaimed jobs
          if (row.status !== "pending" || row.assigned_washer_id) {
            // Job was claimed or status changed — remove from both lists
            setJobs((prev) => prev.filter((j) => j.id !== row.id));
            setDirectRequests((prev) => prev.filter((j) => j.id !== row.id));
            directIds.current.delete(row.id);
            return;
          }

          // Big rig gate
          if (row.services?.category === "big_rig" && !canWashBigRig) return;

          // Radius filter
          if (
            myLat &&
            myLng &&
            row.addresses?.lat &&
            row.addresses?.lng
          ) {
            const d = distanceMilesSimple(
              { lat: myLat, lng: myLng },
              { lat: Number(row.addresses.lat), lng: Number(row.addresses.lng) }
            );
            if (d > radius) return;
          }

          // Check direct request
          const isDirectForMe =
            row.requested_washer_id === userId &&
            row.request_expires_at &&
            new Date(row.request_expires_at).getTime() > Date.now() &&
            !row.request_declined_at;

          if (isDirectForMe) {
            directIds.current.add(row.id);
            setDirectRequests((prev) => {
              if (prev.some((j) => j.id === row.id)) return prev;
              // Flash
              setNewIds((n) => { const a = Array.from(n); a.push(row.id); return new Set(a); });
              setTimeout(() => setNewIds((n) => { const next = new Set(Array.from(n)); next.delete(row.id); return next; }), 1800);
              return [row as QueueJob, ...prev];
            });
            // Remove from general list if it was there
            setJobs((prev) => prev.filter((j) => j.id !== row.id));
            return;
          }

          // General queue
          if (!directIds.current.has(row.id)) {
            setJobs((prev) => {
              // UPDATE in place
              if (prev.some((j) => j.id === row.id)) {
                return prev.map((j) => (j.id === row.id ? (row as QueueJob) : j));
              }
              // New INSERT — flash and prepend
              setNewIds((n) => { const a = Array.from(n); a.push(row.id); return new Set(a); });
              setTimeout(() => setNewIds((n) => { const next = new Set(Array.from(n)); next.delete(row.id); return next; }), 1800);
              return [row as QueueJob, ...prev];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, myLat, myLng, radius, canWashBigRig]);

  const now = Date.now();

  return (
    <div className="px-5 pt-5">
      {/* Direct requests */}
      {directRequests.filter(
        (j) => j.request_expires_at && new Date(j.request_expires_at).getTime() > now
      ).length > 0 && (
        <div className="mb-6 -mx-1">
          <div className="px-1 mb-2 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-sol animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-sol">
              Requested for you · respond before they expire
            </span>
          </div>
          <div className="space-y-2">
            {directRequests
              .filter(
                (j) =>
                  j.request_expires_at &&
                  new Date(j.request_expires_at).getTime() > now
              )
              .map((j) => {
                const net = computeFees({
                  serviceCents: j.service_cents,
                  routedTo: "solo_washer",
                }).washerOrPartnerNet;
                const minsLeft = Math.max(
                  0,
                  Math.ceil((new Date(j.request_expires_at!).getTime() - now) / 60000)
                );
                return (
                  <Link
                    key={j.id}
                    href={`/pro/queue/${j.id}`}
                    className={`block border border-sol bg-sol/10 p-4 hover:bg-sol/20 transition ${
                      newIds.has(j.id) ? "animate-pulse-once" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-wider text-sol mb-1">
                          Direct request · {minsLeft} min left
                        </div>
                        <div className="text-sm font-bold uppercase">
                          {j.services?.tier_name ?? "Service"}
                          {j.vehicle_count > 1 && (
                            <span className="ml-2 font-mono text-[10px] tracking-wider text-sol">
                              × {j.vehicle_count}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-bone/90 mt-1">
                          {j.addresses?.street}, {j.addresses?.city}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="display tabular text-2xl text-sol">{fmtUSD(net)}</div>
                        <div className="font-mono text-[10px] text-bone/75">YOU GET</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
          </div>
        </div>
      )}

      {/* General queue */}
      {jobs.length > 0 ? (
        <div className="space-y-3">
          {jobs.map((j) => {
            const baseNet = computeFees({
              serviceCents: j.service_cents,
              routedTo: "solo_washer",
            }).washerOrPartnerNet;
            const isRush = !!j.is_rush;
            const rushBonus = isRush ? (j.rush_bonus_cents ?? 0) : 0;
            const net = baseNet + rushBonus;
            const dist =
              myLat && myLng && j.addresses?.lat && j.addresses?.lng
                ? distanceMilesSimple(
                    { lat: myLat, lng: myLng },
                    { lat: Number(j.addresses.lat), lng: Number(j.addresses.lng) }
                  ).toFixed(1)
                : null;
            const minsLeft =
              isRush && j.rush_deadline
                ? Math.max(
                    0,
                    Math.ceil(
                      (new Date(j.rush_deadline).getTime() - now) / 60_000
                    )
                  )
                : null;
            const category = j.services?.category ?? "auto";
            const isHome = category === "home";
            const isBigRig = category === "big_rig";
            const containerClass = isRush
              ? "bg-sol/15 hover:bg-sol/25 border-sol"
              : isBigRig
              ? "bg-royal/15 hover:bg-royal/25 border-sol"
              : isHome
              ? "bg-sol/10 hover:bg-sol/15 border-sol"
              : "bg-white/5 hover:bg-white/10 border-royal";
            const pillClass = isBigRig
              ? "bg-sol text-ink"
              : isHome
              ? "bg-sol text-ink"
              : "bg-royal text-bone";
            const pillLabel = isBigRig ? "Big rig" : isHome ? "Home" : "Auto";
            const isNew = newIds.has(j.id);

            return (
              <Link
                key={j.id}
                href={`/pro/queue/${j.id}`}
                className={`block p-4 transition border-l-2 ${containerClass} ${
                  isNew ? "ring-1 ring-sol/60" : ""
                }`}
                style={isNew ? { animation: "fadeSlideIn 0.35s ease-out" } : undefined}
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {isRush && (
                    <span className="font-mono text-[9px] uppercase tracking-wider bg-sol text-ink px-1.5 py-0.5 inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-ink animate-pulse" />
                      Rush · {minsLeft != null ? `${minsLeft} min left` : "now"}
                    </span>
                  )}
                  <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 ${pillClass}`}>
                    {pillLabel}
                  </span>
                  {j.vehicle_count > 1 && !isHome && (
                    <span className="font-mono text-[9px] uppercase tracking-wider bg-bone/20 text-bone px-1.5 py-0.5">
                      × {j.vehicle_count} {isBigRig ? "rigs" : "vehicles"}
                    </span>
                  )}
                  {isNew && (
                    <span className="font-mono text-[9px] uppercase tracking-wider bg-sol text-ink px-1.5 py-0.5">
                      New
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-bold uppercase">
                      {j.services?.tier_name ?? "Service"}
                    </div>
                    <div className="text-xs text-bone/90 mt-1">
                      {j.addresses?.street}, {j.addresses?.city}
                      {dist ? ` · ${dist} mi` : ""}
                    </div>
                    <div className="font-mono text-[10px] text-bone/75 uppercase mt-1.5 tabular">
                      {isRush
                        ? "ASAP · pick up now"
                        : new Date(j.scheduled_window_start).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="display tabular text-2xl text-sol">{fmtUSD(net)}</div>
                    <div className="font-mono text-[10px] text-bone/75">
                      YOU GET{isRush && rushBonus > 0 ? ` (+${fmtUSD(rushBonus)} rush)` : ""}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : directRequests.length === 0 ? (
        <div className="relative overflow-hidden">
          <div
            className="aspect-[16/9] bg-cover bg-center"
            style={{ backgroundImage: "url(/img/og-default.jpg)" }}
          />
          <div className="absolute inset-0 bg-ink/65 flex flex-col items-center justify-center text-center px-6">
            <div className="font-mono text-[10px] uppercase tracking-wider text-sol mb-2">
              Quiet right now
            </div>
            <h2 className="display text-xl text-bone mb-1">No jobs in your radius</h2>
            <p className="text-xs text-bone/75 max-w-xs">
              We&rsquo;ll update this live — no need to refresh. New bookings pop in the moment they&rsquo;re placed.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

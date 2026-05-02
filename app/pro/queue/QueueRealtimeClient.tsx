"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { fmtUSD } from "@/lib/pricing";
import { computeFees } from "@/lib/stripe/fees";
import { checkWasherEligibility, type WasherCapabilities } from "@/lib/job-matching";
import { useTranslations } from "next-intl";

// Single source of truth for the columns + joins the queue card needs.
// Used both for the initial SSR query (queue/page.tsx) and for the
// hydrating fetch we run when a realtime row arrives without joined data.
const QUEUE_JOB_SELECT =
  "id, status, assigned_washer_id, scheduled_window_start, service_cents, vehicle_count, requested_washer_id, request_expires_at, request_declined_at, is_rush, rush_deadline, rush_bonus_cents, services(tier_name, category, requires_water, requires_power, requires_pressure_washer, requires_paint_correction, requires_interior_detail), addresses(street, city, state, zip, lat, lng, has_water, has_power)";

type SortMode = "default" | "distance" | "pay" | "soonest";

export type WasherCaps = WasherCapabilities;

/**
 * Real-time queue list. Receives an initial snapshot from the server
 * component (zero extra latency) then subscribes to Supabase Realtime
 * postgres_changes for the bookings table — no polling, no full-page
 * SSR re-renders.
 *
 * Events handled:
 *   INSERT  → fetch the single row with services/addresses joined, run
 *             the same eligibility + radius gate the server does, then
 *             merge into local state (no router.refresh — that used to
 *             cascade into a flicker storm whenever multiple bookings
 *             changed in quick succession).
 *   UPDATE  → if the new row is no longer pending/unclaimed, drop it
 *             from both lists; otherwise upsert in place.
 *   DELETE  → remove from list.
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
  services: {
    tier_name: string;
    category: string;
    requires_water?: boolean | null;
    requires_power?: boolean | null;
    requires_pressure_washer?: boolean | null;
    requires_paint_correction?: boolean | null;
    requires_interior_detail?: boolean | null;
  } | null;
  addresses: {
    street: string;
    city: string;
    state?: string | null;
    zip?: string | null;
    lat: number | null;
    lng: number | null;
    has_water?: boolean | null;
    has_power?: boolean | null;
  } | null;
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
  serviceAreas,
  washerCaps,
}: {
  initialJobs: QueueJob[];
  initialDirectRequests: QueueJob[];
  userId: string;
  myLat: number | null;
  myLng: number | null;
  radius: number;
  // Lower-cased city names. Empty = no override (use radius).
  serviceAreas: string[];
  washerCaps: WasherCaps;
}) {
  const t = useTranslations("proQueue");
  const [jobs, setJobs] = useState<QueueJob[]>(initialJobs);
  const [directRequests, setDirectRequests] = useState<QueueJob[]>(initialDirectRequests);
  // Track which IDs are direct requests so we don't show them in the general list
  const directIds = useRef(new Set(initialDirectRequests.map((j) => j.id)));

  // Flash animation: IDs of newly arrived jobs
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  // Pro-controlled discovery: sort mode + which service tiers to include.
  // Empty `tierFilter` means "all tiers" (no chips toggled).
  const [sort, setSort] = useState<SortMode>("default");
  const [tierFilter, setTierFilter] = useState<Set<string>>(new Set());

  // Build the tier chip list from whatever tiers exist in the current queue.
  // Pulling from data (not a hardcoded list) means new tiers added later
  // appear automatically.
  const availableTiers = useMemo(() => {
    const tiers = new Set<string>();
    for (const j of jobs) {
      const tier = j.services?.tier_name;
      if (tier) tiers.add(tier);
    }
    return Array.from(tiers).sort();
  }, [jobs]);

  function toggleTier(tier: string) {
    setTierFilter((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      return next;
    });
  }

  // Filter + sort jobs for display. Direct requests bypass this — they're
  // always shown at the top regardless of tier/sort.
  const visibleJobs = useMemo(() => {
    const filtered = tierFilter.size === 0
      ? jobs
      : jobs.filter((j) => j.services?.tier_name && tierFilter.has(j.services.tier_name));
    const dist = (j: QueueJob) =>
      myLat && myLng && j.addresses?.lat && j.addresses?.lng
        ? distanceMilesSimple(
            { lat: myLat, lng: myLng },
            { lat: Number(j.addresses.lat), lng: Number(j.addresses.lng) }
          )
        : Number.POSITIVE_INFINITY;
    const pay = (j: QueueJob) => {
      const base = computeFees({ serviceCents: j.service_cents, routedTo: "solo_washer" }).washerOrPartnerNet;
      return base + (j.is_rush ? (j.rush_bonus_cents ?? 0) : 0);
    };
    const sorted = [...filtered];
    if (sort === "distance") sorted.sort((a, b) => dist(a) - dist(b));
    else if (sort === "pay") sorted.sort((a, b) => pay(b) - pay(a));
    else if (sort === "soonest")
      sorted.sort(
        (a, b) =>
          new Date(a.scheduled_window_start).getTime() -
          new Date(b.scheduled_window_start).getTime()
      );
    // "default" — leave the server's rush-first / soonest order intact.
    return sorted;
  }, [jobs, tierFilter, sort, myLat, myLng]);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Helper: flash a row's id for ~1.8s so the UI can highlight it.
    function flash(id: string) {
      setNewIds((n) => {
        const a = Array.from(n);
        a.push(id);
        return new Set(a);
      });
      setTimeout(() => {
        setNewIds((n) => {
          const next = new Set(Array.from(n));
          next.delete(id);
          return next;
        });
      }, 1800);
    }

    // Decide whether a fully-hydrated row belongs in directRequests or jobs,
    // and merge it. Returns false if the row should be ignored entirely
    // (eligibility / radius gate failed, or it's already been claimed).
    function ingest(row: QueueJob) {
      if (row.status !== "pending" || row.assigned_washer_id) {
        setJobs((prev) => prev.filter((j) => j.id !== row.id));
        setDirectRequests((prev) => prev.filter((j) => j.id !== row.id));
        directIds.current.delete(row.id);
        return false;
      }

      const elig = checkWasherEligibility(row.services, row.addresses, washerCaps);
      if (!elig.ok) return false;

      // Mirrors the SSR reach gate — radius OR city match (additive).
      const jobLat = row.addresses?.lat ? Number(row.addresses.lat) : null;
      const jobLng = row.addresses?.lng ? Number(row.addresses.lng) : null;
      const jobCity = (row.addresses?.city ?? "").toLowerCase().trim();
      const inRadius =
        myLat && myLng && jobLat && jobLng
          ? distanceMilesSimple(
              { lat: myLat, lng: myLng },
              { lat: jobLat, lng: jobLng }
            ) <= radius
          : !myLat || !myLng;
      const inCity =
        serviceAreas.length > 0 && !!jobCity && serviceAreas.includes(jobCity);
      if (!inRadius && !inCity) return false;

      const reqExpiry = row.request_expires_at
        ? new Date(row.request_expires_at).getTime()
        : null;
      const isHeld = !!(reqExpiry && reqExpiry > Date.now() && !(row as any).request_declined_at);

      const isDirectForMe = row.requested_washer_id === userId && isHeld;
      // Exclusivity hold: if this booking is locked to a different
      // washer for the next 10 min, it must NOT appear in this pro's
      // queue. Once the request expires or is declined, it falls
      // through to the general queue below.
      const heldForSomeoneElse =
        !!row.requested_washer_id && row.requested_washer_id !== userId && isHeld;
      if (heldForSomeoneElse) {
        // If we previously had it in either list (e.g. it was unheld
        // and is now held to another pro after a re-request), remove.
        setJobs((prev) => prev.filter((j) => j.id !== row.id));
        setDirectRequests((prev) => prev.filter((j) => j.id !== row.id));
        directIds.current.delete(row.id);
        return false;
      }

      if (isDirectForMe) {
        directIds.current.add(row.id);
        setDirectRequests((prev) => {
          if (prev.some((j) => j.id === row.id)) {
            return prev.map((j) => (j.id === row.id ? row : j));
          }
          flash(row.id);
          return [row, ...prev];
        });
        // Make sure it isn't sitting in the general queue too.
        setJobs((prev) => prev.filter((j) => j.id !== row.id));
        return true;
      }

      if (directIds.current.has(row.id)) {
        // Was a direct request, now isn't — pull it out of directs.
        directIds.current.delete(row.id);
        setDirectRequests((prev) => prev.filter((j) => j.id !== row.id));
      }

      setJobs((prev) => {
        if (prev.some((j) => j.id === row.id)) {
          return prev.map((j) => (j.id === row.id ? row : j));
        }
        flash(row.id);
        return [row, ...prev];
      });
      return true;
    }

    // Realtime payloads don't include joined `services` / `addresses` rows,
    // so when an event arrives that we'd want to ingest we fetch the one
    // row we care about with joins. RLS still applies — if the washer
    // shouldn't see this booking, the fetch returns null and we drop it.
    async function hydrateAndIngest(id: string) {
      const { data } = await supabase
        .from("bookings")
        .select(QUEUE_JOB_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (data) ingest(data as unknown as QueueJob);
    }

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

          // Job was claimed / status moved past pending — drop it without
          // touching the network.
          if (row.status !== "pending" || row.assigned_washer_id) {
            setJobs((prev) => prev.filter((j) => j.id !== row.id));
            setDirectRequests((prev) => prev.filter((j) => j.id !== row.id));
            directIds.current.delete(row.id);
            return;
          }

          // The realtime row is missing services/addresses joins — refetch
          // just this one row and merge. This is the path that used to
          // call router.refresh() and cause the whole-page flicker storm.
          hydrateAndIngest(row.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, myLat, myLng, radius, serviceAreas, washerCaps]);

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
              {t("directRequestsBanner")}
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
                          {t("directRequestLabel", { minsLeft })}
                        </div>
                        <div className="text-sm font-bold uppercase">
                          {j.services?.tier_name ?? t("service")}
                          {j.vehicle_count > 1 && (
                            <span className="ml-2 font-mono text-[10px] tracking-wider text-sol">
                              × {j.vehicle_count}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-bone/90 mt-1">
                          {j.addresses?.street}, {j.addresses?.city}{j.addresses?.state ? `, ${j.addresses.state}` : ""}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="display tabular text-2xl text-sol">{fmtUSD(net)}</div>
                        <div className="font-mono text-[10px] text-bone/75">{t("youGet")}</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
          </div>
        </div>
      )}

      {/* Sort + tier filter bar — only show when there's something to filter */}
      {jobs.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-wider text-bone/60 shrink-0">
              {t("sortLabel")}
            </span>
            <div className="flex gap-1 overflow-x-auto -mx-1 px-1">
              {([
                ["default", t("sortSmart")],
                ["distance", t("sortNearest")],
                ["pay", t("sortHighestPay")],
                ["soonest", t("sortSoonest")],
              ] as [SortMode, string][]).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setSort(k)}
                  className={`shrink-0 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition ${
                    sort === k ? "bg-sol text-ink" : "bg-white/5 text-bone/70 hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {availableTiers.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-wider text-bone/60 shrink-0">
                {t("tierLabel")}
              </span>
              <div className="flex gap-1 overflow-x-auto -mx-1 px-1">
                {availableTiers.map((tier) => {
                  const active = tierFilter.has(tier);
                  return (
                    <button
                      key={tier}
                      onClick={() => toggleTier(tier)}
                      className={`shrink-0 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition ${
                        active ? "bg-bone text-ink" : "bg-white/5 text-bone/70 hover:bg-white/10"
                      }`}
                    >
                      {tier}
                    </button>
                  );
                })}
                {tierFilter.size > 0 && (
                  <button
                    onClick={() => setTierFilter(new Set())}
                    className="shrink-0 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-bone/50 hover:text-bone"
                  >
                    {t("clearFilter")}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* General queue */}
      {visibleJobs.length > 0 ? (
        <div className="space-y-3">
          {visibleJobs.map((j) => {
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
            const pillLabel = isBigRig ? t("categoryBigRig") : isHome ? t("categoryHome") : t("categoryAuto");
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
                      {t("rushLabel", { minsLeft: minsLeft ?? 0 })}
                    </span>
                  )}
                  <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 ${pillClass}`}>
                    {pillLabel}
                  </span>
                  {j.vehicle_count > 1 && !isHome && (
                    <span className="font-mono text-[9px] uppercase tracking-wider bg-bone/20 text-bone px-1.5 py-0.5">
                      × {j.vehicle_count} {isBigRig ? t("rigs") : t("vehicles")}
                    </span>
                  )}
                  {isNew && (
                    <span className="font-mono text-[9px] uppercase tracking-wider bg-sol text-ink px-1.5 py-0.5">
                      {t("newBadge")}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-bold uppercase">
                      {j.services?.tier_name ?? t("service")}
                    </div>
                    <div className="text-xs text-bone/90 mt-1">
                      {j.addresses?.street}, {j.addresses?.city}{j.addresses?.state ? `, ${j.addresses.state}` : ""}
                      {dist ? ` · ${dist} mi` : ""}
                    </div>
                    <div className="font-mono text-[10px] text-bone/75 uppercase mt-1.5 tabular">
                      {isRush
                        ? t("rushAsap")
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
                      {t("youGet")}{isRush && rushBonus > 0 ? ` (+${fmtUSD(rushBonus)} ${t("rush")})` : ""}
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
              {jobs.length > 0 ? t("filteredOutEyebrow") : t("quietEyebrow")}
            </div>
            <h2 className="display text-xl text-bone mb-1">
              {jobs.length > 0 ? t("noJobsMatchFilters") : t("noJobsInRadius")}
            </h2>
            <p className="text-xs text-bone/75 max-w-xs">
              {jobs.length > 0
                ? t("clearFilterHint")
                : t("liveUpdateHint")}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

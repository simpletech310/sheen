"use client";

import { useState } from "react";
import { Eyebrow } from "@/components/brand/Eyebrow";

export type ChecklistItem = {
  id: string;
  label: string;
  hint: string | null;
  requires_photo: boolean;
};

export type AddonGroup = {
  addonId: string;
  addonName: string;
  items: ChecklistItem[];
};

export type VehicleGroup = {
  bookingVehicleId: string | null;
  label: string;
  plate: string | null;
  baseItems: ChecklistItem[];
  addons: AddonGroup[];
};

export type ChecklistEntry = { done_at?: string; photo_path?: string | null };

function progressKey(bvId: string | null, itemId: string): string {
  return bvId ? `${bvId}:${itemId}` : `booking:${itemId}`;
}

function isItemDone(item: ChecklistItem, entry: ChecklistEntry | undefined): boolean {
  if (!entry?.done_at) return false;
  if (item.requires_photo && !entry.photo_path) return false;
  return true;
}

function flattenVehicleItems(v: VehicleGroup): ChecklistItem[] {
  return [...v.baseItems, ...v.addons.flatMap((a) => a.items)];
}

// Read-only mirror of the pro's checklist — same per-vehicle
// collapsible structure so the customer can verify each car got
// every step done (with photos where required) before they tap
// Approve. Default-expand the first vehicle so the customer sees
// progress immediately on load.
export function CustomerChecklist({
  vehicles,
  progress,
  signedPhotoUrls,
  title,
}: {
  vehicles: VehicleGroup[];
  progress: Record<string, ChecklistEntry>;
  signedPhotoUrls: Record<string, string>;
  title?: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(
    vehicles[0]?.bookingVehicleId ?? null
  );

  if (vehicles.length === 0) return null;

  // Aggregate stats so the eyebrow shows total progress at a glance.
  let totalDone = 0;
  let totalAll = 0;
  const stats: Record<string, { done: number; total: number }> = {};
  for (const v of vehicles) {
    const items = flattenVehicleItems(v);
    const done = items.filter((it) =>
      isItemDone(it, progress[progressKey(v.bookingVehicleId, it.id)])
    ).length;
    stats[v.bookingVehicleId ?? "_booking_"] = { done, total: items.length };
    totalDone += done;
    totalAll += items.length;
  }
  const pct = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;

  return (
    <div className="bg-mist/40 p-4 mt-3">
      <div className="flex items-baseline justify-between mb-3">
        <Eyebrow>{title ?? "Service progress"}</Eyebrow>
        <span className="font-mono text-[10px] uppercase tracking-wider text-smoke tabular">
          {totalDone}/{totalAll} · {pct}%
        </span>
      </div>
      <div className="h-[2px] bg-mist mb-3 overflow-hidden">
        <div className="h-full bg-good transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="space-y-2">
        {vehicles.map((v) => {
          const s = stats[v.bookingVehicleId ?? "_booking_"];
          const isOpen = expandedId === v.bookingVehicleId;
          const vehicleDone = s.total > 0 && s.done === s.total;
          return (
            <div
              key={v.bookingVehicleId ?? "_booking_"}
              className={`border-l-2 ${vehicleDone ? "border-good bg-good/5" : "border-royal bg-bone/40"}`}
            >
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : v.bookingVehicleId)}
                aria-expanded={isOpen}
                className="w-full text-left p-3 flex items-center gap-3 hover:bg-bone/30 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink truncate">
                    {v.label}
                    {v.plate && (
                      <span className="ml-2 font-mono text-[10px] text-smoke">· {v.plate}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm tabular text-ink">
                    {s.done}<span className="text-smoke text-xs">/{s.total}</span>
                  </div>
                  <div className={`font-mono text-[9px] uppercase tracking-wider ${vehicleDone ? "text-good" : "text-smoke"}`}>
                    {vehicleDone ? "Done" : "In progress"}
                  </div>
                </div>
                <span className={`shrink-0 ml-1 text-smoke transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden>
                  ⌄
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-bone/40 p-3 space-y-3">
                  {v.baseItems.length > 0 && (
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 mb-1.5 bg-mist text-smoke">
                        Base wash
                      </div>
                      <div className="space-y-1.5">
                        {v.baseItems.map((it) =>
                          renderItem(v.bookingVehicleId, it, progress, signedPhotoUrls)
                        )}
                      </div>
                    </div>
                  )}
                  {v.addons.map((a) => (
                    <div key={a.addonId}>
                      <div className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 mb-1.5 bg-royal/10 text-royal">
                        + {a.addonName}
                      </div>
                      <div className="space-y-1.5">
                        {a.items.map((it) =>
                          renderItem(v.bookingVehicleId, it, progress, signedPhotoUrls)
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderItem(
  bvId: string | null,
  it: ChecklistItem,
  progress: Record<string, ChecklistEntry>,
  signedPhotoUrls: Record<string, string>
) {
  const key = progressKey(bvId, it.id);
  const entry = progress[key];
  const isDone = !!entry?.done_at;
  const photoOk = !it.requires_photo || (isDone && !!entry?.photo_path);
  const fullyDone = isDone && photoOk;
  const photoUrl = entry?.photo_path ? signedPhotoUrls[entry.photo_path] : undefined;
  return (
    <div
      key={key}
      className={`flex items-start gap-3 px-2.5 py-2 border-l-2 ${
        fullyDone ? "border-good bg-good/5" : "border-mist bg-white/40"
      }`}
    >
      <span
        className={`shrink-0 inline-flex items-center justify-center w-4 h-4 mt-0.5 text-[10px] ${
          fullyDone ? "bg-good text-bone" : "bg-mist text-smoke"
        }`}
        aria-hidden
      >
        {fullyDone ? "✓" : ""}
      </span>
      <div className="flex-1 min-w-0">
        <div className={`text-sm leading-tight ${fullyDone ? "text-ink" : "text-smoke"}`}>
          {it.label}
        </div>
        {entry?.done_at && (
          <div className="text-[10px] font-mono text-smoke/70 mt-0.5">
            {new Date(entry.done_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </div>
        )}
      </div>
      {photoUrl && (
        <a
          href={photoUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 block w-12 h-12 bg-mist overflow-hidden relative"
          aria-label="View proof"
        >
          {/^\S+\.(mp4|mov|webm|m4v|avi)(\?|$)/i.test(entry?.photo_path ?? "") ? (
            <>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={photoUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
              <span className="absolute bottom-0 right-0 bg-ink/70 text-bone font-mono text-[8px] uppercase tracking-wider px-1">▶</span>
            </>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
          )}
        </a>
      )}
    </div>
  );
}

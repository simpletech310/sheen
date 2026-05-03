"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";
import { useTranslations } from "next-intl";

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
  // null when this section is the "booking-level" pseudo-vehicle
  // (legacy add-ons with no booking_vehicle_id FK).
  bookingVehicleId: string | null;
  label: string;
  plate: string | null;
  baseItems: ChecklistItem[];
  addons: AddonGroup[];
};

type ProgressEntry = { done_at?: string; photo_path?: string | null };
type Progress = Record<string, ProgressEntry>;

// Progress is keyed by `${bvId}:${itemId}` for per-vehicle items, or
// `booking:${itemId}` when there's no vehicle (legacy/home).
function progressKey(bvId: string | null, itemId: string): string {
  return bvId ? `${bvId}:${itemId}` : `booking:${itemId}`;
}

function isItemDone(item: ChecklistItem, entry: ProgressEntry | undefined): boolean {
  if (!entry?.done_at) return false;
  if (item.requires_photo && !entry.photo_path) return false;
  return true;
}

function flattenVehicleItems(v: VehicleGroup): ChecklistItem[] {
  return [...v.baseItems, ...v.addons.flatMap((a) => a.items)];
}

export function ChecklistClient({
  jobId,
  vehicles,
  initialProgress,
}: {
  jobId: string;
  vehicles: VehicleGroup[];
  initialProgress: Progress;
}) {
  const t = useTranslations("proJobs");
  const router = useRouter();
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const [finalPhotos, setFinalPhotos] = useState<{
    front: string | null;
    back: string | null;
    left: string | null;
    right: string | null;
  }>({ front: null, back: null, left: null, right: null });
  const [uploading, setUploading] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  // First vehicle expanded by default so the pro lands ready to work
  // on something instead of staring at all-collapsed cards.
  const [expandedVehicleId, setExpandedVehicleId] = useState<string | null>(
    vehicles[0]?.bookingVehicleId ?? null
  );

  // Per-vehicle progress counts so each card header can show "5/14".
  const vehicleStats = useMemo(() => {
    const stats: Record<string, { done: number; total: number }> = {};
    for (const v of vehicles) {
      const items = flattenVehicleItems(v);
      const done = items.filter((it) =>
        isItemDone(it, progress[progressKey(v.bookingVehicleId, it.id)])
      ).length;
      stats[v.bookingVehicleId ?? "_booking_"] = { done, total: items.length };
    }
    return stats;
  }, [vehicles, progress]);

  const totalAcross = useMemo(
    () => vehicles.reduce((a, v) => a + flattenVehicleItems(v).length, 0),
    [vehicles]
  );
  const doneAcross = useMemo(
    () =>
      Object.values(vehicleStats).reduce((a, s) => a + s.done, 0),
    [vehicleStats]
  );
  const allChecklistDone = totalAcross > 0 && doneAcross === totalAcross;
  const finalPhotosDone =
    !!finalPhotos.front &&
    !!finalPhotos.back &&
    !!finalPhotos.left &&
    !!finalPhotos.right;
  const allDone = allChecklistDone && finalPhotosDone;
  const pct = totalAcross > 0 ? Math.round((doneAcross / totalAcross) * 100) : 0;

  async function setItem(
    bvId: string | null,
    item: ChecklistItem,
    doneFlag: boolean,
    photoPath?: string | null
  ) {
    const key = progressKey(bvId, item.id);
    const prev = progress[key];
    const next: Progress = { ...progress };
    if (doneFlag) {
      next[key] = {
        done_at: new Date().toISOString(),
        photo_path: photoPath ?? prev?.photo_path ?? null,
      };
    } else {
      delete next[key];
    }
    setProgress(next);

    try {
      const r = await fetch(`/api/bookings/${jobId}/checklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: item.id,
          booking_vehicle_id: bvId,
          done: doneFlag,
          photo_path: photoPath ?? prev?.photo_path ?? null,
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || t("couldNotSave"));
      }
    } catch (e: any) {
      setProgress((p) => {
        const back = { ...p };
        if (prev) back[key] = prev;
        else delete back[key];
        return back;
      });
      toast(e.message || t("couldNotSave"), "error");
    }
  }

  async function uploadAndCheck(bvId: string | null, item: ChecklistItem, file: File) {
    const uploadKey = `${bvId ?? "_booking_"}:${item.id}`;
    setUploading(uploadKey);
    try {
      const ext = (file.name.split(".").pop() || "jpg")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      const sig = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket: "booking-photos",
          scope: jobId,
          ext: ext.slice(0, 6) || "jpg",
        }),
      });
      if (!sig.ok) throw new Error(t("uploadSetupFailed"));
      const { signed_url, path } = await sig.json();

      const put = await fetch(signed_url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) throw new Error(t("photoUploadFailed"));

      await setItem(bvId, item, true, path);
      toast(t("photoSaved"), "success");
    } catch (e: any) {
      toast(e.message || t("couldNotUpload"), "error");
    } finally {
      setUploading(null);
    }
  }

  async function uploadFinalPhoto(key: keyof typeof finalPhotos, file: File) {
    setUploading(key);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const sig = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket: "booking-photos", scope: jobId, ext: ext.slice(0, 6) || "jpg" }),
      });
      if (!sig.ok) throw new Error(t("uploadSetupFailed"));
      const { signed_url, path } = await sig.json();

      const put = await fetch(signed_url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) throw new Error(t("photoUploadFailed"));

      setFinalPhotos((prev) => ({ ...prev, [key]: path }));
      toast(t("photoSaved"), "success");
    } catch (e: any) {
      toast(e.message || t("couldNotUpload"), "error");
    } finally {
      setUploading(null);
    }
  }

  function toggle(bvId: string | null, item: ChecklistItem) {
    const key = progressKey(bvId, item.id);
    const isDone = !!progress[key]?.done_at;
    if (isDone) {
      setItem(bvId, item, false);
      return;
    }
    if (item.requires_photo) {
      toast(t("addPhotoToComplete"), "info");
      return;
    }
    setItem(bvId, item, true);
  }

  async function complete() {
    if (!allDone) return;
    setCompleting(true);
    try {
      const paths = [finalPhotos.front, finalPhotos.back, finalPhotos.left, finalPhotos.right].filter(Boolean) as string[];
      const r = await fetch(`/api/bookings/${jobId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work_photo_paths: paths }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        const detail =
          Array.isArray(d.missing) && d.missing.length > 0
            ? `${d.error}: ${d.missing.join(", ")}`
            : d.error || t("couldNotComplete");
        throw new Error(detail);
      }
      toast(t("jobCompleteSuccess"), "success");
      router.push("/pro/queue");
      router.refresh();
    } catch (e: any) {
      toast(e.message || t("couldNotComplete"), "error");
      setCompleting(false);
    }
  }

  const finalPhotoLabels: Record<string, string> = {
    front: t("photoFront"),
    back: t("photoBack"),
    left: t("photoDriverSide"),
    right: t("photoPassengerSide"),
  };

  // Render a single checklist item — same UI shape used everywhere
  // (base service items + addon items inside an addon block).
  function renderItem(bvId: string | null, item: ChecklistItem) {
    const key = progressKey(bvId, item.id);
    const entry = progress[key];
    const isDone = !!entry?.done_at;
    const photoOk = !item.requires_photo || (isDone && !!entry?.photo_path);
    const fullyDone = isDone && photoOk;
    const uploadKey = `${bvId ?? "_booking_"}:${item.id}`;
    return (
      <div
        key={key}
        className={`p-3 transition border-l-2 ${
          fullyDone
            ? "bg-good/10 border-good"
            : "bg-white/5 border-bone/15 hover:border-sol/40"
        }`}
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => toggle(bvId, item)}
            aria-pressed={fullyDone}
            className={`shrink-0 w-6 h-6 mt-0.5 flex items-center justify-center transition border-2 ${
              fullyDone
                ? "bg-good border-good text-ink"
                : "bg-transparent border-bone/40 hover:border-sol"
            }`}
          >
            {fullyDone && (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className={`text-sm font-bold ${fullyDone ? "text-bone/60 line-through" : "text-bone"}`}>
                {item.label}
              </span>
              {item.requires_photo && (
                <span className={`shrink-0 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 ${fullyDone ? "text-bone/40" : "text-sol"}`}>
                  📷 {t("photoLabel")}
                </span>
              )}
            </div>
            {item.hint && (
              <div className="text-xs text-bone/55 mt-1 leading-relaxed">{item.hint}</div>
            )}
            {item.requires_photo && (
              <div className="mt-3">
                {entry?.photo_path ? (
                  <div className="flex items-center gap-3 bg-bone/5 px-3 py-2 text-xs">
                    <div className="w-8 h-8 bg-sol/20 flex items-center justify-center text-sol">✓</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-bone/80 truncate">{t("photoOnFile")}</div>
                    </div>
                    <label className="text-[10px] uppercase tracking-wider text-sol cursor-pointer hover:text-bone">
                      {t("replacePhoto")}
                      <input
                        type="file"
                        accept="image/*,video/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadAndCheck(bvId, item, f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <label
                    className={`block w-full text-center py-3 text-xs font-bold uppercase tracking-wide cursor-pointer transition ${
                      uploading === uploadKey ? "bg-bone/10 text-bone/50" : "bg-sol text-ink hover:bg-bone"
                    }`}
                  >
                    {uploading === uploadKey ? t("uploading") : t("addPhotoOrVideo")}
                    <input
                      type="file"
                      accept="image/*,video/*"
                      capture="environment"
                      disabled={uploading === uploadKey}
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadAndCheck(bvId, item, f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Progress hero — total across every vehicle. */}
      <div className="bg-white/5 p-4 mb-5 relative overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-[3px] bg-sol transition-all"
          style={{ width: `${pct}%` }}
        />
        <div className="flex items-baseline justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-bone/60">
              {t("progress")}
            </div>
            <div className="display tabular text-3xl mt-1">
              {doneAcross}<span className="text-bone/40 text-xl">/{totalAcross}</span>
            </div>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-sol tabular">
            {t("percentDone", { pct })}
          </div>
        </div>
      </div>

      {/* Per-vehicle collapsible cards. Tap header to expand/collapse.
          Only one open at a time — keeps the page focused. */}
      <div className="space-y-3 mb-7">
        {vehicles.map((v) => {
          const stats = vehicleStats[v.bookingVehicleId ?? "_booking_"];
          const isOpen = expandedVehicleId === v.bookingVehicleId;
          const vehicleDone = stats.total > 0 && stats.done === stats.total;
          return (
            <div
              key={v.bookingVehicleId ?? "_booking_"}
              className={`border-l-2 ${vehicleDone ? "border-good bg-good/10" : "border-sol bg-white/5"}`}
            >
              <button
                type="button"
                onClick={() => setExpandedVehicleId(isOpen ? null : v.bookingVehicleId)}
                aria-expanded={isOpen}
                className="w-full text-left p-4 flex items-center gap-3 hover:bg-white/5 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-bone/60">
                    {t("vehicleHeader")}
                  </div>
                  <div className="text-sm font-bold mt-0.5 truncate text-bone">
                    {v.label}
                    {v.plate && (
                      <span className="ml-2 font-mono text-[10px] text-bone/55">· {v.plate}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="display tabular text-lg text-bone">
                    {stats.done}<span className="text-bone/40 text-sm">/{stats.total}</span>
                  </div>
                  <div className={`font-mono text-[9px] uppercase tracking-wider ${vehicleDone ? "text-good" : "text-bone/55"}`}>
                    {vehicleDone ? t("checklistVehicleDone") : t("checklistVehicleProgress")}
                  </div>
                </div>
                <span className={`shrink-0 ml-2 text-bone/55 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden>
                  ⌄
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-bone/15 p-3 space-y-4">
                  {v.baseItems.length > 0 && (
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 mb-2 bg-white/5 text-bone/60">
                        {t("checklistBaseGroup")}
                      </div>
                      <div className="space-y-2">
                        {v.baseItems.map((it) => renderItem(v.bookingVehicleId, it))}
                      </div>
                    </div>
                  )}
                  {v.addons.map((a) => (
                    <div key={a.addonId}>
                      <div className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 mb-2 bg-sol/15 text-sol">
                        + {a.addonName}
                      </div>
                      <div className="space-y-2">
                        {a.items.map((it) => renderItem(v.bookingVehicleId, it))}
                      </div>
                    </div>
                  ))}
                  {v.baseItems.length === 0 && v.addons.length === 0 && (
                    <div className="text-xs text-bone/55 text-center py-3">
                      {t("checklistVehicleEmpty")}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mandatory Final Photos */}
      <div className="mt-8 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wide mb-1">{t("finalResultsHeading")}</h2>
        <p className="text-xs text-bone/60 mb-4">{t("finalPhotosInstructions")}</p>
        <div className="grid grid-cols-2 gap-3">
          {(["front", "back", "left", "right"] as const).map((key) => {
            const path = finalPhotos[key];
            const isUploading = uploading === key;
            return (
              <div key={key} className={`border p-3 transition ${path ? "bg-good/10 border-good" : "bg-white/5 border-bone/20"}`}>
                <div className="text-xs font-bold uppercase mb-2">{finalPhotoLabels[key]}</div>
                {path ? (
                  <div className="text-xs font-mono text-good flex items-center gap-1.5">
                    <span className="shrink-0 w-4 h-4 rounded-full bg-good text-ink flex items-center justify-center">✓</span>
                    {t("uploaded")}
                  </div>
                ) : (
                  <label className={`block w-full text-center py-2 text-[10px] font-bold uppercase tracking-wide cursor-pointer transition ${isUploading ? "bg-bone/10 text-bone/50" : "bg-sol text-ink hover:bg-bone"}`}>
                    {isUploading ? t("uploading") : t("addPhotoOrVideoShort")}
                    <input
                      type="file"
                      accept="image/*,video/*"
                      capture="environment"
                      disabled={isUploading}
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadFinalPhoto(key, f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={complete}
        disabled={!allDone || completing}
        className="w-full bg-sol text-ink py-4 text-sm font-bold uppercase tracking-wide hover:bg-bone disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {completing
          ? t("completing")
          : allDone
          ? t("markJobComplete")
          : !allChecklistDone
          ? t("finishMoreSteps", { remaining: totalAcross - doneAcross })
          : t("uploadFinalPhotos")}
      </button>
      <p className="text-[11px] text-bone/45 mt-3 text-center leading-relaxed">{t("completeNote")}</p>
    </>
  );
}

"use client";

import { useState } from "react";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { toast } from "@/components/ui/Toast";

const MAX_PHOTOS = 4;

export type SiteAccessValue = {
  hasWater: boolean | null;
  hasPower: boolean | null;
  waterNotes: string;
  powerNotes: string;
  gateCode: string;
  sitePhotoPaths: string[];
};

export const EMPTY_SITE_ACCESS: SiteAccessValue = {
  hasWater: null,
  hasPower: null,
  waterNotes: "",
  powerNotes: "",
  gateCode: "",
  sitePhotoPaths: [],
};

// Captures the bare minimum a washer needs to know about the site:
// is there water/power on-site, where it is, the gate code, and (optional)
// a photo. Required toggles are water + power — everything else is
// optional so the checkout flow stays fast.
export function SiteAccessForm({
  value,
  onChange,
}: {
  value: SiteAccessValue;
  onChange: (next: SiteAccessValue) => void;
}) {
  const [busy, setBusy] = useState(false);

  function set<K extends keyof SiteAccessValue>(k: K, v: SiteAccessValue[K]) {
    onChange({ ...value, [k]: v });
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (value.sitePhotoPaths.length + files.length > MAX_PHOTOS) {
      toast(`Up to ${MAX_PHOTOS} site photos`, "error");
      return;
    }
    setBusy(true);
    try {
      const next = [...value.sitePhotoPaths];
      for (const file of Array.from(files)) {
        const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
        const sig = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bucket: "booking-photos", scope: "site", ext }),
        });
        const sigData = await sig.json();
        if (!sig.ok) throw new Error(sigData.error || "Upload setup failed");
        const put = await fetch(sigData.signed_url, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!put.ok) throw new Error(`Upload failed (${put.status})`);
        next.push(sigData.path);
      }
      onChange({ ...value, sitePhotoPaths: next });
      toast("Site photo added", "success");
    } catch (e: any) {
      toast(e.message || "Could not upload", "error");
    } finally {
      setBusy(false);
    }
  }

  function removePhoto(p: string) {
    onChange({ ...value, sitePhotoPaths: value.sitePhotoPaths.filter((x) => x !== p) });
  }

  return (
    <div className="space-y-5">
      <ToggleRow
        label="Water on site?"
        sub="Outside spigot, hose bib — anything your pro can hook into."
        value={value.hasWater}
        onChange={(v) => set("hasWater", v)}
      />
      {value.hasWater !== null && (
        <input
          value={value.waterNotes}
          onChange={(e) => set("waterNotes", e.target.value)}
          placeholder={
            value.hasWater
              ? "Where is the spigot? (e.g. side of garage)"
              : "Want to flag anything about water? (optional)"
          }
          className="w-full px-4 py-3 bg-bone border border-mist text-sm"
        />
      )}

      <ToggleRow
        label="Power outlet on site?"
        sub="Standard outdoor outlet. Most washes don't need it — toggle off if there isn't one."
        value={value.hasPower}
        onChange={(v) => set("hasPower", v)}
      />
      {value.hasPower !== null && (
        <input
          value={value.powerNotes}
          onChange={(e) => set("powerNotes", e.target.value)}
          placeholder={
            value.hasPower
              ? "Where is the outlet? (e.g. by the front door)"
              : "Anything to flag about power? (optional)"
          }
          className="w-full px-4 py-3 bg-bone border border-mist text-sm"
        />
      )}

      <div>
        <Eyebrow>Gate code · optional</Eyebrow>
        <input
          value={value.gateCode}
          onChange={(e) => set("gateCode", e.target.value)}
          placeholder="Gate / building code (only your pro sees this)"
          className="mt-2 w-full px-4 py-3 bg-bone border border-mist text-sm font-mono"
        />
      </div>

      <div>
        <Eyebrow>Site photo · optional but helpful</Eyebrow>
        <div className="mt-2 flex flex-wrap gap-2">
          {value.sitePhotoPaths.map((p) => (
            <div key={p} className="relative w-16 h-16 bg-mist border border-mist overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-smoke">
                ✓ Photo
              </div>
              <button
                type="button"
                onClick={() => removePhoto(p)}
                aria-label="Remove photo"
                className="absolute top-0 right-0 bg-bad text-bone w-5 h-5 leading-none text-xs hover:bg-ink"
              >
                ×
              </button>
            </div>
          ))}
          {value.sitePhotoPaths.length < MAX_PHOTOS && (
            <label
              className={`w-16 h-16 flex flex-col items-center justify-center border border-dashed border-smoke cursor-pointer hover:bg-mist/40 transition ${
                busy ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <span className="text-2xl text-smoke leading-none">＋</span>
              <span className="font-mono text-[9px] text-smoke uppercase mt-1">
                {busy ? "…" : "Add"}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
                disabled={busy}
              />
            </label>
          )}
        </div>
        <div className="text-[11px] text-smoke mt-2">
          A quick photo of the driveway / spigot helps your pro arrive prepared.
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div>
      <div className="text-sm font-bold">{label}</div>
      <div className="text-[11px] text-smoke leading-relaxed mt-0.5">{sub}</div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`py-2.5 text-xs font-bold uppercase tracking-wide border transition ${
            value === true
              ? "bg-ink text-bone border-ink"
              : "bg-bone text-ink border-mist hover:bg-mist/40"
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`py-2.5 text-xs font-bold uppercase tracking-wide border transition ${
            value === false
              ? "bg-ink text-bone border-ink"
              : "bg-bone text-ink border-mist hover:bg-mist/40"
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}

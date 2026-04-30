"use client";

import { useState } from "react";
import { toast } from "@/components/ui/Toast";

const MAX_PHOTOS = 10;

export function ConditionPhotoPicker({
  vehicleId,
  paths,
  onChange,
}: {
  vehicleId: string;
  paths: string[];
  onChange: (paths: string[]) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (paths.length + files.length > MAX_PHOTOS) {
      toast(`Up to ${MAX_PHOTOS} photos per vehicle`, "error");
      return;
    }
    setBusy(true);
    try {
      const next: string[] = [...paths];
      for (const file of Array.from(files)) {
        const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
        const sig = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bucket: "booking-photos",
            scope: `condition_${vehicleId}`,
            ext,
          }),
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
        onChange([...next]);
      }
      toast(`Photo${files.length === 1 ? "" : "s"} added`, "success");
    } catch (e: any) {
      toast(e.message || "Could not upload photo", "error");
    } finally {
      setBusy(false);
    }
  }

  function remove(p: string) {
    onChange(paths.filter((x) => x !== p));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {paths.map((p) => (
          <div key={p} className="relative w-16 h-16 bg-mist border border-mist overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center bg-mist flex items-center justify-center text-[10px] font-mono text-smoke">
              ✓ Photo
            </div>
            <button
              type="button"
              onClick={() => remove(p)}
              aria-label="Remove photo"
              className="absolute top-0 right-0 bg-bad text-bone w-5 h-5 leading-none text-xs hover:bg-ink"
            >
              ×
            </button>
          </div>
        ))}
        {paths.length < MAX_PHOTOS && (
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
        {paths.length} / {MAX_PHOTOS} photos · helps your pro see the current condition
      </div>
    </div>
  );
}

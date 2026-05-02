"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";

type Item = {
  id: string;
  label: string;
  hint: string | null;
  requires_photo: boolean;
};

type ProgressEntry = { done_at?: string; photo_path?: string | null };
type Progress = Record<string, ProgressEntry>;

export function ChecklistClient({
  jobId,
  items,
  initialProgress,
}: {
  jobId: string;
  items: Item[];
  initialProgress: Progress;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const [finalPhotos, setFinalPhotos] = useState<{
    front: string | null;
    back: string | null;
    left: string | null;
    right: string | null;
  }>({
    front: null,
    back: null,
    left: null,
    right: null,
  });
  const [uploading, setUploading] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  const total = items.length;
  const done = useMemo(
    () =>
      items.filter((it) => {
        const e = progress[it.id];
        if (!e?.done_at) return false;
        if (it.requires_photo && !e.photo_path) return false;
        return true;
      }).length,
    [items, progress]
  );
  const checklistDone = total > 0 && done === total;
  const finalPhotosDone = 
    !!finalPhotos.front && 
    !!finalPhotos.back && 
    !!finalPhotos.left && 
    !!finalPhotos.right;
  const allDone = checklistDone && finalPhotosDone;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  async function setItem(item: Item, doneFlag: boolean, photoPath?: string | null) {
    // Optimistic — flip state immediately, roll back on error.
    const prev = progress[item.id];
    const next: Progress = { ...progress };
    if (doneFlag) {
      next[item.id] = {
        done_at: new Date().toISOString(),
        photo_path: photoPath ?? prev?.photo_path ?? null,
      };
    } else {
      delete next[item.id];
    }
    setProgress(next);

    try {
      const r = await fetch(`/api/bookings/${jobId}/checklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: item.id,
          done: doneFlag,
          photo_path: photoPath ?? prev?.photo_path ?? null,
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || "Could not save");
      }
    } catch (e: any) {
      // Roll back the optimistic update.
      setProgress((p) => {
        const back = { ...p };
        if (prev) back[item.id] = prev;
        else delete back[item.id];
        return back;
      });
      toast(e.message || "Could not save", "error");
    }
  }

  async function uploadAndCheck(item: Item, file: File) {
    setUploading(item.id);
    try {
      // 1. Get signed upload URL.
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
      if (!sig.ok) throw new Error("Upload setup failed");
      const { signed_url, path } = await sig.json();

      // 2. PUT the file.
      const put = await fetch(signed_url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) throw new Error("Photo upload failed");

      // 3. Mark done with the new path.
      await setItem(item, true, path);
      toast("Photo saved", "success");
    } catch (e: any) {
      toast(e.message || "Could not upload", "error");
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
      if (!sig.ok) throw new Error("Upload setup failed");
      const { signed_url, path } = await sig.json();

      const put = await fetch(signed_url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) throw new Error("Photo upload failed");

      setFinalPhotos((prev) => ({ ...prev, [key]: path }));
      toast("Photo saved", "success");
    } catch (e: any) {
      toast(e.message || "Could not upload", "error");
    } finally {
      setUploading(null);
    }
  }

  function toggle(item: Item) {
    const isDone = !!progress[item.id]?.done_at;
    if (isDone) {
      setItem(item, false);
      return;
    }
    if (item.requires_photo) {
      // Don't toggle here — photo upload handles it.
      toast("Add a photo to mark this item done", "info");
      return;
    }
    setItem(item, true);
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
            : d.error || "Could not complete";
        throw new Error(detail);
      }
      toast("Job complete · waiting for customer approval", "success");
      router.push("/pro/queue");
      router.refresh();
    } catch (e: any) {
      toast(e.message || "Could not complete", "error");
      setCompleting(false);
    }
  }

  return (
    <>
      {/* Progress hero */}
      <div className="bg-white/5 p-4 mb-5 relative overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-[3px] bg-sol transition-all"
          style={{ width: `${pct}%` }}
        />
        <div className="flex items-baseline justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-bone/60">
              Progress
            </div>
            <div className="display tabular text-3xl mt-1">
              {done}
              <span className="text-bone/40 text-xl">/{total}</span>
            </div>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-sol tabular">
            {pct}% done
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2 mb-7">
        {items.map((item) => {
          const entry = progress[item.id];
          const isDone = !!entry?.done_at;
          const photoOk =
            !item.requires_photo || (isDone && !!entry?.photo_path);
          const fullyDone = isDone && photoOk;
          return (
            <div
              key={item.id}
              className={`p-4 transition border-l-2 ${
                fullyDone
                  ? "bg-good/10 border-good"
                  : "bg-white/5 border-bone/15 hover:border-sol/40"
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggle(item)}
                  aria-pressed={fullyDone}
                  className={`shrink-0 w-6 h-6 mt-0.5 flex items-center justify-center transition border-2 ${
                    fullyDone
                      ? "bg-good border-good text-ink"
                      : "bg-transparent border-bone/40 hover:border-sol"
                  }`}
                >
                  {fullyDone && (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M3 8l3 3 7-7"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-sm font-bold ${
                        fullyDone ? "text-bone/60 line-through" : "text-bone"
                      }`}
                    >
                      {item.label}
                    </span>
                    {item.requires_photo && (
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 ${
                          fullyDone ? "text-bone/40" : "text-sol"
                        }`}
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                        >
                          <rect x="1.5" y="3.5" width="13" height="10" rx="1" />
                          <circle cx="8" cy="8.5" r="2.5" />
                          <path d="M5 3.5l1.5-2h3L11 3.5" />
                        </svg>
                        Photo
                      </span>
                    )}
                  </div>
                  {item.hint && (
                    <div className="text-xs text-bone/55 mt-1 leading-relaxed">
                      {item.hint}
                    </div>
                  )}

                  {/* Photo upload zone — only for photo-required items. */}
                  {item.requires_photo && (
                    <div className="mt-3">
                      {entry?.photo_path ? (
                        <div className="flex items-center gap-3 bg-bone/5 px-3 py-2 text-xs">
                          <div className="w-8 h-8 bg-sol/20 flex items-center justify-center text-sol">
                            ✓
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-bone/80 truncate">
                              Photo on file
                            </div>
                            <div className="text-[10px] text-bone/40 truncate font-mono">
                              {entry.photo_path.split("/").pop()}
                            </div>
                          </div>
                          <label className="text-[10px] uppercase tracking-wider text-sol cursor-pointer hover:text-bone">
                            Replace
                            <input
                              type="file"
                              accept="image/*,video/*"
                              capture="environment"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) uploadAndCheck(item, f);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        </div>
                      ) : (
                        <label
                          className={`block w-full text-center py-3 text-xs font-bold uppercase tracking-wide cursor-pointer transition ${
                            uploading === item.id
                              ? "bg-bone/10 text-bone/50"
                              : "bg-sol text-ink hover:bg-bone"
                          }`}
                        >
                          {uploading === item.id
                            ? "Uploading…"
                            : "+ Add photo or video"}
                          <input
                            type="file"
                            accept="image/*,video/*"
                            capture="environment"
                            disabled={uploading === item.id}
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) uploadAndCheck(item, f);
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
        })}
      </div>

      {/* Mandatory Final Photos */}
      <div className="mt-8 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wide mb-1">Final Results</h2>
        <p className="text-xs text-bone/60 mb-4">
          Upload 4 photos of the finished job before completing.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(["front", "back", "left", "right"] as const).map((key) => {
            const path = finalPhotos[key];
            const isUploading = uploading === key;
            const labels: Record<string, string> = {
              front: "Front",
              back: "Back",
              left: "Driver Side",
              right: "Passenger Side",
            };
            return (
              <div key={key} className={`border p-3 transition ${path ? "bg-good/10 border-good" : "bg-white/5 border-bone/20"}`}>
                <div className="text-xs font-bold uppercase mb-2">
                  {labels[key]}
                </div>
                {path ? (
                  <div className="text-xs font-mono text-good flex items-center gap-1.5">
                    <span className="shrink-0 w-4 h-4 rounded-full bg-good text-ink flex items-center justify-center">✓</span>
                    Uploaded
                  </div>
                ) : (
                  <label className={`block w-full text-center py-2 text-[10px] font-bold uppercase tracking-wide cursor-pointer transition ${isUploading ? "bg-bone/10 text-bone/50" : "bg-sol text-ink hover:bg-bone"}`}>
                    {isUploading ? "Uploading…" : "+ Photo or video"}
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

      {/* Complete CTA — disabled until all items done. */}
      <button
        onClick={complete}
        disabled={!allDone || completing}
        className="w-full bg-sol text-ink py-4 text-sm font-bold uppercase tracking-wide hover:bg-bone disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {completing
          ? "Completing…"
          : allDone
          ? "Mark job complete →"
          : !checklistDone
          ? `Finish ${total - done} more to complete`
          : "Upload final photos"}
      </button>
      <p className="text-[11px] text-bone/45 mt-3 text-center leading-relaxed">
        Once you mark complete, the customer gets a notification to approve the
        work. You get paid as soon as they approve.
      </p>
    </>
  );
}

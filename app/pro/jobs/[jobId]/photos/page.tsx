"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { createClient } from "@/lib/supabase/client";

type Slot = { kind: "before" | "after"; preview: string; path: string };

const REQUIRED = 3;

export default function PhotosPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const router = useRouter();
  const [before, setBefore] = useState<Slot[]>([]);
  const [after, setAfter] = useState<Slot[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function uploadOne(file: File, kind: "before" | "after") {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().slice(0, 6);
    // 1. Get signed upload URL
    const sigRes = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucket: "booking-photos", scope: jobId, ext }),
    });
    if (!sigRes.ok) throw new Error("Could not get upload URL");
    const sig = await sigRes.json();

    // 2. Upload directly via Supabase signed-upload
    const supa = createClient();
    const { error } = await supa.storage
      .from("booking-photos")
      .uploadToSignedUrl(sig.path, sig.token, file);
    if (error) throw new Error(error.message);

    return { kind, path: sig.path, preview: URL.createObjectURL(file) } satisfies Slot;
  }

  async function add(kind: "before" | "after", e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    try {
      const slot = await uploadOne(file, kind);
      if (kind === "before") setBefore((s) => [...s, slot]);
      else setAfter((s) => [...s, slot]);
    } catch (er: any) {
      setErr(er.message);
    }
  }

  async function complete() {
    if (before.length < REQUIRED || after.length < REQUIRED) return;
    setSubmitting(true);
    setErr(null);
    try {
      // Register photos
      await fetch(`/api/bookings/${jobId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: [...before, ...after].map((s) => ({ kind: s.kind, storage_path: s.path })),
        }),
      });
      // Mark complete
      const cRes = await fetch(`/api/bookings/${jobId}/complete`, { method: "POST" });
      if (!cRes.ok) {
        const e = await cRes.json().catch(() => ({}));
        throw new Error(e.error || `Status ${cRes.status}`);
      }
      router.push("/pro/earnings");
    } catch (er: any) {
      setErr(er.message);
    } finally {
      setSubmitting(false);
    }
  }

  function Slot({ slot }: { slot?: Slot }) {
    return (
      <div className="aspect-square bg-white/5 flex items-center justify-center relative overflow-hidden">
        {slot ? (
          <img src={slot.preview} alt="" className="w-full h-full object-cover" />
        ) : null}
      </div>
    );
  }

  return (
    <div className="px-5 pt-10 pb-8">
      <Eyebrow className="!text-bone/60" prefix={null}>
        Proof of work
      </Eyebrow>
      <h1 className="display text-3xl mt-3 mb-7">UPLOAD PHOTOS</h1>

      <div className="mb-7">
        <div className="flex justify-between mb-2">
          <span className="font-mono text-[10px] text-bone/60 uppercase">Before · {before.length}/{REQUIRED}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) =>
            before[i] ? (
              <Slot key={`b${i}`} slot={before[i]} />
            ) : (
              <label key={`bn${i}`} className="aspect-square bg-white/5 flex items-center justify-center cursor-pointer text-3xl text-bone/40 hover:bg-white/10">
                +<input type="file" accept="image/*" capture="environment" onChange={(e) => add("before", e)} className="hidden" />
              </label>
            )
          )}
        </div>
      </div>

      <div className="mb-7">
        <div className="flex justify-between mb-2">
          <span className="font-mono text-[10px] text-bone/60 uppercase">After · {after.length}/{REQUIRED}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) =>
            after[i] ? (
              <Slot key={`a${i}`} slot={after[i]} />
            ) : (
              <label key={`an${i}`} className="aspect-square bg-white/5 flex items-center justify-center cursor-pointer text-3xl text-bone/40 hover:bg-white/10">
                +<input type="file" accept="image/*" capture="environment" onChange={(e) => add("after", e)} className="hidden" />
              </label>
            )
          )}
        </div>
      </div>

      {err && <div className="text-sm text-bad mb-4">{err}</div>}

      <button
        onClick={complete}
        disabled={submitting || before.length < REQUIRED || after.length < REQUIRED}
        className="w-full bg-sol text-ink py-4 text-sm font-bold uppercase tracking-wide disabled:opacity-50 hover:bg-bone"
      >
        {submitting ? "Completing…" : "Mark complete →"}
      </button>
    </div>
  );
}

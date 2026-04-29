"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Eyebrow } from "@/components/brand/Eyebrow";

export default function PhotosPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const router = useRouter();
  const [before, setBefore] = useState<string[]>([]);
  const [after, setAfter] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const required = 3;

  function add(kind: "before" | "after", e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // For MVP, just preview locally. Real upload to Supabase Storage in a follow-up.
    const url = URL.createObjectURL(file);
    if (kind === "before") setBefore((s) => [...s, url]);
    else setAfter((s) => [...s, url]);
  }

  async function complete() {
    setSubmitting(true);
    try {
      await fetch(`/api/bookings/${jobId}/complete`, { method: "POST" });
      router.push("/pro/earnings");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-5 pt-10 pb-8">
      <Eyebrow className="!text-bone/60" prefix={null}>
        Proof of work
      </Eyebrow>
      <h1 className="display text-3xl mt-3 mb-7">Upload photos</h1>

      <div className="mb-7">
        <div className="flex justify-between mb-2">
          <span className="font-mono text-[10px] text-bone/60 uppercase">Before · {before.length}/{required}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-square bg-white/5 flex items-center justify-center relative overflow-hidden">
              {before[i] ? (
                <img src={before[i]} alt="" className="w-full h-full object-cover" />
              ) : (
                <label className="cursor-pointer text-3xl text-bone/40">
                  +
                  <input type="file" accept="image/*" onChange={(e) => add("before", e)} className="hidden" />
                </label>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mb-7">
        <div className="flex justify-between mb-2">
          <span className="font-mono text-[10px] text-bone/60 uppercase">After · {after.length}/{required}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-square bg-white/5 flex items-center justify-center relative overflow-hidden">
              {after[i] ? (
                <img src={after[i]} alt="" className="w-full h-full object-cover" />
              ) : (
                <label className="cursor-pointer text-3xl text-bone/40">
                  +
                  <input type="file" accept="image/*" onChange={(e) => add("after", e)} className="hidden" />
                </label>
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={complete}
        disabled={submitting || before.length < required || after.length < required}
        className="w-full bg-cobalt text-bone rounded-full py-4 text-sm font-semibold disabled:opacity-50"
      >
        {submitting ? "Completing…" : "Mark complete →"}
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { toast } from "@/components/ui/Toast";

const tips = [
  { pct: 18, label: "18%" },
  { pct: 22, label: "22%" },
  { pct: 25, label: "25%" },
];

// Next 14: params is a plain sync object. Don't wrap in Promise + use().
export default function RatePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [stars, setStars] = useState(5);
  const [tipPct, setTipPct] = useState(22);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const r = await fetch(`/api/bookings/${id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars, tip_pct: tipPct, comment }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || "Could not submit rating");
      }
      toast(
        tipPct > 0 ? "Rating + tip sent · thanks!" : "Rating sent · thanks!",
        "success"
      );
      router.push("/app/washes");
    } catch (e: any) {
      toast(e.message || "Could not submit rating", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/app/tracking/${id}`} className="text-smoke text-sm">
          ← Back
        </Link>
      </div>
      <Eyebrow>Rate your wash</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-6">How&rsquo;d we do?</h1>

      <div className="flex gap-2 mb-7">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setStars(n)}
            className={`text-4xl ${n <= stars ? "text-cobalt" : "text-mist"}`}
            aria-label={`${n} stars`}
          >
            ★
          </button>
        ))}
      </div>

      <Eyebrow>Add a tip · 100% to your pro</Eyebrow>
      <div className="grid grid-cols-4 gap-2 mt-3 mb-6">
        {tips.map((t) => (
          <button
            key={t.pct}
            onClick={() => setTipPct(t.pct)}
            className={`p-3 text-sm ${tipPct === t.pct ? "bg-ink text-bone" : "bg-mist/50"}`}
          >
            {t.label}
          </button>
        ))}
        <button onClick={() => setTipPct(0)} className={`p-3 text-sm ${tipPct === 0 ? "bg-ink text-bone" : "bg-mist/50"}`}>
          Custom
        </button>
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Anything to say? (optional)"
        rows={3}
        className="w-full px-4 py-3 bg-bone border border-mist rounded-md text-sm"
      />

      <button
        onClick={submit}
        disabled={submitting}
        className="mt-6 w-full bg-cobalt text-bone rounded-full py-4 text-sm font-semibold disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit & rebook →"}
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";

export function BackgroundCheckStep({
  status,
  verified,
}: {
  status: string;
  verified: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  let pill: { tone: "good" | "sol" | "bad"; label: string };
  if (verified || status === "verified") pill = { tone: "good", label: "Verified" };
  else if (status === "denied") pill = { tone: "bad", label: "Denied" };
  else if (status === "pending") pill = { tone: "sol", label: "In review" };
  else pill = { tone: "sol", label: "Todo" };

  async function submit() {
    setBusy(true);
    try {
      const r = await fetch("/api/pro/background-check", { method: "POST" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || "Could not submit");
      }
      toast("Submitted · we'll review in 24–48h", "success");
      router.refresh();
    } catch (e: any) {
      toast(e.message || "Could not submit", "error");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = status === "not_submitted" || status === "denied";

  return (
    <div
      className={`p-5 border-l-2 ${
        pill.tone === "good"
          ? "bg-good/10 border-good"
          : pill.tone === "bad"
          ? "bg-bad/15 border-bad"
          : "bg-white/5 border-sol"
      }`}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-wider opacity-60">
            Step 03 · Background check
          </div>
          <div className="text-sm font-bold mt-1">
            {pill.tone === "good"
              ? "Background check verified"
              : status === "pending"
              ? "Under review"
              : "Submit for background check"}
          </div>
          <p className="text-[12px] text-bone/65 mt-1.5 leading-relaxed">
            We screen for driving record + criminal history. Results in 24–48h.
          </p>
        </div>
        <span
          className={`shrink-0 font-mono text-[10px] uppercase tracking-wider px-2 py-1 ${
            pill.tone === "good"
              ? "bg-good text-ink"
              : pill.tone === "bad"
              ? "bg-bad text-bone"
              : "bg-sol text-ink"
          }`}
        >
          {pill.label}
        </span>
      </div>
      {canSubmit ? (
        <button
          onClick={submit}
          disabled={busy}
          className="mt-4 w-full py-3 text-xs font-bold uppercase tracking-wide bg-sol text-ink hover:bg-bone disabled:opacity-50"
        >
          {busy ? "Submitting…" : status === "denied" ? "Resubmit →" : "Submit for review →"}
        </button>
      ) : status === "pending" ? (
        <div className="mt-4 bg-bone/5 px-3 py-2 text-[11px] text-bone/60 font-mono">
          Submitted · 24–48h SLA
        </div>
      ) : null}
    </div>
  );
}

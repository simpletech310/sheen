"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { toast } from "@/components/ui/Toast";

/**
 * Live timer for the in-progress job. The real per-tier QA checklist
 * lives at /pro/jobs/[id]/checklist — this page is a stopwatch + a
 * one-tap link there. We don't duplicate the checklist here so the
 * source of truth stays single.
 */
export default function TimerPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const [elapsed, setElapsed] = useState(0);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Mark booking as in_progress on first mount. Surface failures so a
  // silently-failed UPDATE doesn't leave the booking stuck on 'arrived'
  // while the pro thinks they've started.
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/bookings/${jobId}/start`, { method: "POST" });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error || `Could not start (status ${r.status})`);
        }
      } catch (e: any) {
        setStartError(e.message);
        toast(e.message || "Could not start work", "error");
      }
    })();
  }, [jobId]);

  const hr = Math.floor(elapsed / 3600);
  const min = Math.floor((elapsed % 3600) / 60);
  const sec = elapsed % 60;

  return (
    <div className="px-5 pt-10 pb-8">
      <Eyebrow className="!text-bone/60" prefix={null}>
        In progress
      </Eyebrow>
      <div className="display tabular text-[88px] leading-none mt-4 mb-1">
        {hr > 0 ? `${hr}:${String(min).padStart(2, "0")}` : min}
        <span className="text-bone/30">:</span>
        {String(sec).padStart(2, "0")}
      </div>
      <div
        className={`font-mono text-[11px] uppercase tracking-wider ${
          startError ? "text-bad" : "text-good"
        }`}
      >
        {startError ? "● Status not updated — see error below" : "● Live · timer running"}
      </div>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mt-5 mb-6" />

      {startError && (
        <div className="bg-bad/15 border-l-2 border-bad p-4 mb-6">
          <div className="font-mono text-[10px] uppercase tracking-wider text-bad mb-1">
            Could not flip status to in-progress
          </div>
          <div className="text-sm text-bone/85">{startError}</div>
          <p className="text-[11px] text-bone/55 mt-2 leading-relaxed">
            The timer&rsquo;s still recording your time. Tap the button below to
            retry — if it keeps failing, finish the job and email
            hello@sheen.co with the booking ID.
          </p>
          <button
            type="button"
            onClick={() => {
              setStartError(null);
              fetch(`/api/bookings/${jobId}/start`, { method: "POST" }).then(
                async (r) => {
                  if (!r.ok) {
                    const d = await r.json().catch(() => ({}));
                    setStartError(d.error || `Status ${r.status}`);
                  }
                }
              );
            }}
            className="mt-3 px-3 py-2 bg-bad text-bone text-xs font-bold uppercase tracking-wide hover:bg-bone hover:text-bad transition"
          >
            Retry
          </button>
        </div>
      )}

      <p className="text-sm text-bone/65 leading-relaxed mb-6">
        Work through the per-job checklist as you go. Photos for required steps
        get uploaded inline. When everything&rsquo;s checked off, the customer
        gets the approval prompt and you get paid.
      </p>

      <Link
        href={`/pro/jobs/${jobId}/checklist`}
        className="block w-full bg-sol text-ink py-4 text-sm font-bold uppercase tracking-wide hover:bg-bone transition text-center"
      >
        Open job checklist →
      </Link>

      <Link
        href={`/pro/jobs/${jobId}/navigate`}
        className="mt-3 block w-full bg-bone/10 text-bone py-3 text-xs font-bold uppercase tracking-wide hover:bg-bone hover:text-ink transition text-center"
      >
        ← Back to navigate
      </Link>
    </div>
  );
}

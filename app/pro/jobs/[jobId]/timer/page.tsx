"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { toast } from "@/components/ui/Toast";

/**
 * Live timer for the in-progress job. The real per-tier QA checklist
 * lives at /pro/jobs/[id]/checklist — this page is a stopwatch + a
 * one-tap link there. We don't duplicate the checklist here so the
 * source of truth stays single.
 *
 * Timer is PERSISTENT: on first mount we call /start (which returns
 * started_at), store it in localStorage keyed by jobId, and compute
 * elapsed from the real DB timestamp. Refreshing the page restores
 * the same start time so the clock never resets.
 *
 * Next 14: params is a plain sync object. Don't wrap in Promise + use()
 * — that's a Next 15 pattern and crashes here with React error #438.
 */
export default function TimerPage({
  params,
}: {
  params: { jobId: string };
}) {
  const { jobId } = params;
  const [elapsed, setElapsed] = useState(0);
  const [startError, setStartError] = useState<string | null>(null);
  // Anchor: unix ms when the job actually started (from DB / cache).
  const anchorRef = useRef<number | null>(null);

  // On mount: call /start. If already started, the API returns the
  // existing started_at unchanged. Cache it in localStorage so
  // subsequent refreshes don't lose the origin even if the API is slow.
  useEffect(() => {
    const storageKey = `sheen_job_start_${jobId}`;

    async function initTimer() {
      // Fast path: use cached anchor so the clock shows immediately.
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        anchorRef.current = Number(cached);
        setElapsed(Math.floor((Date.now() - anchorRef.current) / 1000));
      }

      try {
        const r = await fetch(`/api/bookings/${jobId}/start`, { method: "POST" });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error || `Could not start (status ${r.status})`);
        }
        const d = await r.json();
        // started_at is the canonical DB value (already set if this is
        // a re-open/refresh, newly set if this is the first call).
        if (d.started_at) {
          const anchor = new Date(d.started_at).getTime();
          anchorRef.current = anchor;
          localStorage.setItem(storageKey, String(anchor));
          setElapsed(Math.floor((Date.now() - anchor) / 1000));
        }
      } catch (e: any) {
        setStartError(e.message);
        toast(e.message || "Could not start work", "error");
      }
    }

    initTimer();
  }, [jobId]);

  // Tick every second from the anchor, not from a local counter.
  useEffect(() => {
    const t = setInterval(() => {
      if (anchorRef.current !== null) {
        setElapsed(Math.floor((Date.now() - anchorRef.current) / 1000));
      } else {
        setElapsed((e) => e + 1);
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

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

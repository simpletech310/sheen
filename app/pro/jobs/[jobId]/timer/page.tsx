"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { toast } from "@/components/ui/Toast";

/**
 * Persistent job timer with pause support.
 *
 * STATE (all DB-backed, hydrated on mount):
 *   started_at       — wall-clock start time (set once, never changes)
 *   paused_at        — non-null while the timer is paused
 *   total_paused_ms  — cumulative milliseconds spent paused in prior sessions
 *   status           — 'in_progress' | 'completed' | ...
 *
 * ELAPSED FORMULA:
 *   running: elapsed = (now - started_at) - total_paused_ms
 *   paused:  elapsed = (paused_at - started_at) - total_paused_ms  [frozen]
 *
 * The timer only ever stops advancing when:
 *   a) the pro taps Pause, or
 *   b) the job status reaches 'completed'
 */
export default function TimerPage({ params }: { params: { jobId: string } }) {
  const { jobId } = params;

  // Core timing state — all sourced from DB on mount
  const [, setStartedAt]           = useState<number | null>(null); // unix ms
  const [, setPausedAt]             = useState<number | null>(null); // unix ms or null
  const [, setTotalPausedMs]   = useState(0);
  const [jobStatus, setJobStatus]           = useState<string>("in_progress");

  // Derived display state
  const [elapsed, setElapsed]     = useState(0);
  const [isPaused, setIsPaused]   = useState(false);
  const [pausePending, setPausePending] = useState(false); // API in-flight
  const [startError, setStartError]    = useState<string | null>(null);
  const [ready, setReady]              = useState(false);

  // Refs for interval — avoids stale closure issues
  const startedAtRef    = useRef<number | null>(null);
  const pausedAtRef     = useRef<number | null>(null);
  const totalPausedRef  = useRef(0);

  // Compute elapsed given current timing refs
  const computeElapsed = useCallback(() => {
    const anchor = startedAtRef.current;
    if (!anchor) return 0;
    const frozenAt = pausedAtRef.current;
    const wall = frozenAt ?? Date.now();
    return Math.max(0, Math.floor((wall - anchor - totalPausedRef.current) / 1000));
  }, []);

  // ── Mount: initialise from DB ──────────────────────────────────────────────
  useEffect(() => {
    const storageKey = `sheen_job_start_${jobId}`;

    async function init() {
      // 1. Fast path: show something immediately from localStorage
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const anchor = Number(cached);
        startedAtRef.current = anchor;
        setStartedAt(anchor);
        setElapsed(Math.floor((Date.now() - anchor) / 1000));
      }

      // 2. Canonical state from the DB via /start (idempotent — won't reset)
      try {
        const r = await fetch(`/api/bookings/${jobId}/start`, { method: "POST" });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error || `Could not start (${r.status})`);
        }
        const d = await r.json();

        // Sync timing state
        if (d.started_at) {
          const anchor = new Date(d.started_at).getTime();
          startedAtRef.current = anchor;
          totalPausedRef.current = d.total_paused_ms ?? 0;
          setStartedAt(anchor);
          setTotalPausedMs(d.total_paused_ms ?? 0);
          localStorage.setItem(storageKey, String(anchor));

          if (d.paused_at) {
            const pa = new Date(d.paused_at).getTime();
            pausedAtRef.current = pa;
            setPausedAt(pa);
            setIsPaused(true);
          }

          if (d.status) setJobStatus(d.status);
          setElapsed(computeElapsed());
        }
      } catch (e: any) {
        setStartError(e.message);
        toast(e.message || "Could not start work", "error");
      } finally {
        setReady(true);
      }
    }

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  // ── Tick every second (only when not paused and not completed) ─────────────
  useEffect(() => {
    const t = setInterval(() => {
      if (!pausedAtRef.current && jobStatus === "in_progress") {
        setElapsed(computeElapsed());
      }
    }, 1000);
    return () => clearInterval(t);
  }, [jobStatus, computeElapsed]);

  // ── Pause / Resume ─────────────────────────────────────────────────────────
  async function togglePause() {
    if (pausePending) return;
    setPausePending(true);
    try {
      const r = await fetch(`/api/bookings/${jobId}/pause`, { method: "POST" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        toast(d.error || "Could not toggle pause", "error");
        return;
      }
      const d = await r.json();
      const newTotalMs: number = d.total_paused_ms ?? 0;
      totalPausedRef.current = newTotalMs;
      setTotalPausedMs(newTotalMs);

      if (d.paused) {
        // Just paused — freeze the clock
        const pa = d.paused_at ? new Date(d.paused_at).getTime() : Date.now();
        pausedAtRef.current = pa;
        setPausedAt(pa);
        setIsPaused(true);
        setElapsed(computeElapsed()); // freeze at this value
      } else {
        // Just resumed — unfreeze
        pausedAtRef.current = null;
        setPausedAt(null);
        setIsPaused(false);
      }
    } finally {
      setPausePending(false);
    }
  }

  // ── Format ─────────────────────────────────────────────────────────────────
  const hr  = Math.floor(elapsed / 3600);
  const min = Math.floor((elapsed % 3600) / 60);
  const sec = elapsed % 60;

  const isCompleted = jobStatus === "completed";
  const statusLabel = isCompleted
    ? "● Completed"
    : isPaused
    ? "● Paused"
    : "● Live · timer running";
  const statusColor = isCompleted
    ? "text-good"
    : isPaused
    ? "text-sol"
    : startError
    ? "text-bad"
    : "text-good";

  return (
    <div className="px-5 pt-10 pb-8">
      <Eyebrow className="!text-bone/75" prefix={null}>
        {isCompleted ? "Job complete" : "In progress"}
      </Eyebrow>

      {/* Big clock */}
      <div
        className={`display tabular text-[88px] leading-none mt-4 mb-1 transition-opacity ${
          isPaused && !isCompleted ? "opacity-60" : "opacity-100"
        }`}
      >
        {hr > 0 ? `${hr}:${String(min).padStart(2, "0")}` : min}
        <span className="text-bone/30">:</span>
        {String(sec).padStart(2, "0")}
      </div>

      <div className={`font-mono text-[11px] uppercase tracking-wider ${statusColor}`}>
        {startError ? "● Status not updated — see error" : statusLabel}
      </div>

      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mt-5 mb-6" />

      {/* Pause / Resume button — only while job is in_progress */}
      {!isCompleted && ready && (
        <button
          type="button"
          onClick={togglePause}
          disabled={pausePending}
          className={`w-full py-4 text-sm font-bold uppercase tracking-wide transition mb-3 ${
            isPaused
              ? "bg-sol text-ink hover:bg-bone"
              : "bg-bone/10 text-bone hover:bg-bone/20 border border-bone/20"
          } disabled:opacity-50`}
        >
          {pausePending ? "…" : isPaused ? "▶ Resume timer" : "⏸ Pause timer"}
        </button>
      )}

      {/* Start error panel */}
      {startError && (
        <div className="bg-bad/15 border-l-2 border-bad p-4 mb-6">
          <div className="font-mono text-[10px] uppercase tracking-wider text-bad mb-1">
            Could not flip status to in-progress
          </div>
          <div className="text-sm text-bone/85">{startError}</div>
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

      {/* Pause info */}
      {isPaused && !isCompleted && (
        <div className="bg-sol/10 border-l-2 border-sol p-4 mb-6">
          <div className="font-mono text-[10px] uppercase tracking-wider text-sol mb-1">
            Timer paused
          </div>
          <p className="text-sm text-bone/85 leading-relaxed">
            The clock is frozen. Tap <strong>Resume</strong> when you&rsquo;re back
            on the job. Pause time is not counted in your job duration.
          </p>
        </div>
      )}

      {/* Completed info */}
      {isCompleted && (
        <div className="bg-good/10 border-l-2 border-good p-4 mb-6">
          <div className="font-mono text-[10px] uppercase tracking-wider text-good mb-1">
            Job complete
          </div>
          <p className="text-sm text-bone/85 leading-relaxed">
            This job is done. The time above is your final job duration.
          </p>
        </div>
      )}

      {!isPaused && !isCompleted && (
        <p className="text-sm text-bone/75 leading-relaxed mb-6">
          Work through the per-job checklist as you go. When everything&rsquo;s
          checked off the customer approves and you get paid.
        </p>
      )}

      {!isCompleted && (
        <Link
          href={`/pro/jobs/${jobId}/checklist`}
          className="block w-full bg-sol text-ink py-4 text-sm font-bold uppercase tracking-wide hover:bg-bone transition text-center"
        >
          Open job checklist →
        </Link>
      )}

      <Link
        href={`/pro/jobs/${jobId}/navigate`}
        className="mt-3 block w-full bg-bone/10 text-bone py-3 text-xs font-bold uppercase tracking-wide hover:bg-bone hover:text-ink transition text-center"
      >
        ← Back to navigate
      </Link>
    </div>
  );
}

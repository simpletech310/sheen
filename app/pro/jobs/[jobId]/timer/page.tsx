"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";

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

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Mark booking as in_progress on first mount (best-effort).
  useEffect(() => {
    fetch(`/api/bookings/${jobId}/start`, { method: "POST" }).catch(() => {});
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
      <div className="font-mono text-[11px] text-good uppercase tracking-wider">
        ● Live · timer running
      </div>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mt-5 mb-6" />

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

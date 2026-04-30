"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";

const checklist = [
  "Foam pre-soak",
  "Two-bucket wash",
  "Clay bar",
  "Interior vacuum",
  "Hand wax",
  "Leather conditioning",
  "Tire shine + windows",
  "Final inspection",
];

export default function TimerPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState<Set<number>>(new Set());

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Mark booking as in_progress on first mount of the timer (best effort).
  useEffect(() => {
    fetch(`/api/bookings/${jobId}/start`, { method: "POST" }).catch(() => {});
  }, [jobId]);

  const min = Math.floor(elapsed / 60);
  const sec = elapsed % 60;

  function toggle(i: number) {
    setDone((prev) => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  }

  return (
    <div className="px-5 pt-10 pb-8">
      <Eyebrow className="!text-bone/60" prefix={null}>
        In progress
      </Eyebrow>
      <div className="display tabular text-7xl mt-4 mb-1">
        {min}:{String(sec).padStart(2, "0")}
      </div>
      <div className="font-mono text-[11px] text-good uppercase">● ON TRACK</div>

      <div className="mt-7 space-y-2">
        {checklist.map((step, i) => (
          <button
            key={step}
            onClick={() => toggle(i)}
            className={`w-full flex items-center gap-3 p-3 text-left text-sm ${
              done.has(i) ? "bg-cobalt/20 text-bone" : "bg-white/5 text-bone/70"
            }`}
          >
            <span
              className={`w-5 h-5 flex items-center justify-center border ${
                done.has(i) ? "bg-cobalt border-cobalt text-bone" : "border-bone/40 text-transparent"
              }`}
            >
              ✓
            </span>
            {step}
          </button>
        ))}
      </div>

      <Link
        href={`/pro/jobs/${jobId}/photos`}
        className="mt-7 block w-full bg-cobalt text-bone rounded-full py-4 text-sm font-semibold text-center"
      >
        Done · Upload photos →
      </Link>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Polls /api/bookings/<id>/status every 4s so the washer's check-in
 * screen auto-flips to the timer the instant the customer confirms.
 * Tiny payload — just status + started_at.
 */
export function CheckInPolling({
  jobId,
  initialStartedAt,
}: {
  jobId: string;
  initialStartedAt: string | null | undefined;
}) {
  const router = useRouter();
  useEffect(() => {
    if (initialStartedAt) {
      // Already checked in — kick off to the timer page immediately.
      router.replace(`/pro/jobs/${jobId}/timer`);
      return;
    }
    let alive = true;
    const id = setInterval(async () => {
      try {
        const r = await fetch(`/api/bookings/${jobId}/status`, {
          cache: "no-store",
        });
        if (!r.ok) return;
        const d = await r.json();
        if (!alive) return;
        if (d.started_at) {
          router.replace(`/pro/jobs/${jobId}/timer`);
        }
      } catch {
        /* keep polling */
      }
    }, 4_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [jobId, initialStartedAt, router]);
  return null;
}

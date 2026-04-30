"use client";

import { useEffect, useState } from "react";

/**
 * Polls the washer-side unread-message count every 30s. Used by
 * ProBottomNav to render a sol-gold dot when there's something to read.
 *
 * Realtime subscription would be nicer; v2.
 */
export function useUnreadProMessages(intervalMs = 30_000) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function tick() {
      try {
        const r = await fetch("/api/pro/conversations?count_only=1", {
          cache: "no-store",
        });
        if (!r.ok) return;
        const d = await r.json();
        if (!alive) return;
        setUnread(Number(d.unread ?? 0));
      } catch {
        /* swallow — bottom nav can survive a missed poll */
      }
    }

    tick();
    timer = setInterval(tick, intervalMs);
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, [intervalMs]);

  return unread;
}

"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "@/components/ui/Toast";

/**
 * App-wide listener for "this booking was requested for me by handle".
 * Sits in the /pro layout so a washer hears about a direct request the
 * second it lands, even when they're on /pro/wallet, /pro/me, or any
 * page that isn't the queue.
 *
 * Push notifications already cover this when they deliver — but Safari
 * without PWA install, locked phones, etc. mean they're best-effort.
 * This is the in-app safety net.
 */
export function DirectRequestListener({ userId }: { userId: string | null }) {
  const router = useRouter();
  // Don't toast the same booking twice if realtime sends multiple updates
  // (status flip, accept-request decline, etc.).
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = supabase
      .channel(`pro-direct-requests:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT for new requests, UPDATE for re-requests
          schema: "public",
          table: "bookings",
          filter: `requested_washer_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          const row = payload.new as any;
          if (!row?.id) return;
          // Only fire for *active* direct requests — not for the UPDATE we
          // get back when the request is accepted/declined and the
          // requested_washer_id is cleared.
          const expiresAt = row.request_expires_at
            ? new Date(row.request_expires_at).getTime()
            : null;
          const stillOpen =
            row.status === "pending" &&
            !row.assigned_washer_id &&
            !row.request_declined_at &&
            expiresAt &&
            expiresAt > Date.now();
          if (!stillOpen) return;
          if (seen.current.has(row.id)) return;
          seen.current.add(row.id);

          toast(
            "🔔 Direct request — tap to view",
            "info"
          );
          // Best-effort native vibration so phones in pockets get noticed.
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            try {
              (navigator as any).vibrate?.([180, 80, 180]);
            } catch {
              /* ignore */
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // router intentionally not in deps — toast click handling is
    // separate; including it would re-subscribe needlessly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return null;
}

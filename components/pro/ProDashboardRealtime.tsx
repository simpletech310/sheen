"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

// Listens for any change that affects what a washer sees on their wallet,
// earnings, or /pro/me dashboard:
//
//   1. payouts row inserted/updated   — wallet + earnings (kind, status,
//                                       amount_cents, stripe_transfer_id)
//   2. washer_profiles updated         — jobs_completed + rating_avg +
//                                       reviews_count rollup trigger fires
//                                       on every review insert/update
//   3. bookings updated for me         — funded transitions, status flips
//                                       on the active job (mirrors the
//                                       customer-side BookingsRealtime)
//
// One coalesced router.refresh() per burst (250 ms) keeps the server
// re-render rate sane when several events hit in the same transaction.
export function ProDashboardRealtime({ userId }: { userId: string | null }) {
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    let pending: ReturnType<typeof setTimeout> | null = null;
    const queueRefresh = () => {
      if (pending) return;
      pending = setTimeout(() => {
        pending = null;
        router.refresh();
      }, 250);
    };

    const channel = supabase
      .channel(`pro-dashboard:${userId}`)
      // Payouts table is filtered by washer_id at the realtime layer; RLS
      // would block reads of other pros' rows anyway, but the filter saves
      // a round-trip per event.
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payouts", filter: `washer_id=eq.${userId}` },
        queueRefresh
      )
      // Profile rollup — rating_avg + reviews_count + jobs_completed all
      // live here. Every review insert + every job completion flips this
      // row and the dashboard numbers should follow.
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "washer_profiles", filter: `user_id=eq.${userId}` },
        queueRefresh
      )
      // Mirror of the customer-side subscription so the pro's *own* booking
      // views (timer, navigate, queue detail) react to status flips coming
      // from the customer (approve, cancel, dispute).
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings", filter: `assigned_washer_id=eq.${userId}` },
        queueRefresh
      )
      .subscribe();

    return () => {
      if (pending) clearTimeout(pending);
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return null;
}

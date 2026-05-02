"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

// Listens for any row change on the customer's bookings (status flips,
// new bookings, cancellations) and refreshes the current server-rendered
// page so the next-wash card / washes list show the latest state without
// a manual reload. Mounted once per layout.
//
// Subscribing to the bookings table without a column filter would fire on
// every wash for every customer; the realtime channel respects RLS so we
// only get rows the user can read — which is exactly the customer's own
// bookings (or, for the pro variant, the rows their queue policy allows).
export function BookingsRealtime({ userId }: { userId: string | null }) {
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Coalesce bursts (e.g. status + funds_released_at in the same tx) into
    // one refresh so we don't thrash the server router.
    let pending: ReturnType<typeof setTimeout> | null = null;
    const queueRefresh = () => {
      if (pending) return;
      pending = setTimeout(() => {
        pending = null;
        router.refresh();
      }, 250);
    };

    const channel = supabase
      .channel(`customer-bookings:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `customer_id=eq.${userId}`,
        },
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

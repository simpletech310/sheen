"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { fmtUSD } from "@/lib/pricing";

/**
 * Live washer wallet view. Stripe-side numbers (available to cash out,
 * settling) come from the SSR shell once and don't move on a useful
 * timescale (Stripe payout schedule is days). The number that actually
 * moves second-to-second is the *escrow* — money the customer's funded
 * booking is holding until they approve. We subscribe to the local
 * payouts table to keep that in sync without ever refreshing the page.
 *
 * Realtime requires migration 0028 (payouts in supabase_realtime,
 * REPLICA IDENTITY FULL on bookings + payouts).
 */

export type WalletPayout = {
  id: string;
  amount_cents: number;
  status: string; // pending | releasing | paid | failed | reversed
  kind: string | null; // wash | tip
  created_at: string;
  booking_id: string;
  bookings: { services: { tier_name: string | null } | null } | null;
};

export function WalletLiveTotals({
  userId,
  initialPayouts,
  stripeAvailable,
  stripePending,
  connected,
  cashOutSlot,
}: {
  userId: string;
  initialPayouts: WalletPayout[];
  stripeAvailable: number;
  stripePending: number;
  connected: boolean;
  // The "Cash out / Tax & 1099" buttons are passed in as a slot so the
  // server component can keep owning anything that needs server-only deps.
  cashOutSlot: React.ReactNode;
}) {
  const [payouts, setPayouts] = useState<WalletPayout[]>(initialPayouts);

  useEffect(() => {
    if (!userId) return;
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = supabase
      .channel(`wallet:payouts:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payouts",
          filter: `washer_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as any).id as string;
            setPayouts((prev) => prev.filter((p) => p.id !== id));
            return;
          }
          // INSERT / UPDATE — full row in payload.new because of REPLICA
          // IDENTITY FULL. The joined services name isn't there though,
          // so we keep whatever we already had (or fall back to "Service").
          const row = payload.new as any;
          setPayouts((prev) => {
            const existing = prev.find((p) => p.id === row.id);
            const merged: WalletPayout = {
              id: row.id,
              amount_cents: row.amount_cents,
              status: row.status,
              kind: row.kind ?? null,
              created_at: row.created_at,
              booking_id: row.booking_id,
              bookings: existing?.bookings ?? null,
            };
            if (existing) {
              return prev.map((p) => (p.id === row.id ? merged : p));
            }
            return [merged, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Lifetime + escrow totals derived from the live list.
  const paid = payouts.filter((p) => p.status === "paid");
  const lifetimeWash = paid
    .filter((p) => p.kind !== "tip")
    .reduce((a, p) => a + (p.amount_cents ?? 0), 0);
  const lifetimeTip = paid
    .filter((p) => p.kind === "tip")
    .reduce((a, p) => a + (p.amount_cents ?? 0), 0);
  const lifetime = lifetimeWash + lifetimeTip;
  const escrowPending = payouts
    .filter((p) => p.status === "pending" || p.status === "releasing")
    .reduce((a, p) => a + (p.amount_cents ?? 0), 0);

  // Sum of payouts we recorded as "paid" but where Stripe's settlement
  // window hasn't closed yet. We don't track the per-payout settlement
  // moment (Stripe handles that on its own 2-7 day schedule) so we treat
  // any `paid` row as a possible-still-settling candidate, capped at the
  // actual Stripe pending number. Anything ABOVE that cap is legacy money
  // from before our payout records existed.
  const recentPaidLocal = paid.reduce((a, p) => a + (p.amount_cents ?? 0), 0);
  const legacyPending = Math.max(0, stripePending - recentPaidLocal);

  const subline = (() => {
    if (!connected) return "Setup payouts to start earning";
    const parts: string[] = [];
    if (escrowPending > 0) parts.push(`${fmtUSD(escrowPending)} in escrow`);
    if (stripePending > 0) {
      // Two cases worth distinguishing for the pro: (a) Stripe is processing
      // the wash/tips they can already see in the list — "settling", or
      // (b) Stripe holds money that doesn't tie to any local payout row
      // (legacy / pre-records / migrated transfers) — say so explicitly so
      // the number doesn't look like a phantom bug.
      if (legacyPending > stripePending * 0.2 && legacyPending > 1000) {
        parts.push(`${fmtUSD(stripePending)} on Stripe (2–7 days)`);
      } else {
        parts.push(`${fmtUSD(stripePending)} settling`);
      }
    }
    if (parts.length === 0) return "All funds settled";
    return parts.join(" · ");
  })();

  return (
    <>
      <div className="mt-3 bg-sol p-6 text-ink rounded-none">
        <div className="font-mono text-[10px] uppercase opacity-80">
          Available to Cash Out
        </div>
        <div className="display tabular text-5xl mt-1">{fmtUSD(stripeAvailable)}</div>
        <div className="text-xs opacity-70 mt-2">{subline}</div>
        {cashOutSlot}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="bg-white/5 p-4 border-l-2 border-sol/30">
          <div className="font-mono text-[10px] uppercase opacity-60">Lifetime</div>
          <div className="display tabular text-2xl mt-1 text-sol">{fmtUSD(lifetime)}</div>
        </div>
        <div className="bg-white/5 p-4 border-l-2 border-bone/30">
          <div className="font-mono text-[10px] uppercase opacity-60">Jobs</div>
          <div className="display tabular text-2xl mt-1">{fmtUSD(lifetimeWash)}</div>
        </div>
        <div className="bg-white/5 p-4 border-l-2 border-good/30">
          <div className="font-mono text-[10px] uppercase opacity-60">Tips</div>
          <div className="display tabular text-2xl mt-1 text-good">{fmtUSD(lifetimeTip)}</div>
        </div>
      </div>

      <div className="mt-7">
        <div className="font-mono text-[10px] uppercase tracking-wider !text-bone/60">
          ── Recent payouts
        </div>
        <div className="mt-3 space-y-2">
          {payouts.map((p) => {
            const isTip = p.kind === "tip";
            return (
              <div key={p.id} className="bg-white/5 p-3 flex justify-between text-sm">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {p.bookings?.services?.tier_name ?? "Service"}
                    {isTip && (
                      <span className="text-[9px] font-mono uppercase tracking-wider text-good bg-good/10 px-1.5 py-0.5">
                        Tip
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-bone/50 font-mono mt-1">
                    {new Date(p.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    ·{" "}
                    <span
                      className={
                        p.status === "paid"
                          ? "text-good"
                          : p.status === "reversed" || p.status === "failed"
                          ? "text-bad"
                          : "text-sol"
                      }
                    >
                      {p.status}
                    </span>
                  </div>
                </div>
                <div className={`display tabular ${isTip ? "text-good" : ""}`}>
                  {fmtUSD(p.amount_cents)}
                </div>
              </div>
            );
          })}
          {payouts.length === 0 && (
            <div className="bg-white/5 p-6 text-center text-sm text-bone/60">
              No payouts yet. Complete a job to earn your first transfer.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

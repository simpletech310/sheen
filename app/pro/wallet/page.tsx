import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";
import { WalletActions } from "./WalletActions";
import { getStripe } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const supabase = createClient();
  const stripe = getStripe();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: payouts } = await supabase
    .from("payouts")
    .select("id, amount_cents, status, kind, created_at, booking_id, bookings(services(tier_name))")
    .eq("washer_id", user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(50);

  // Split lifetime totals by kind so the pro can see tips earned separately
  // from job earnings — the tax + motivation context they're usually after.
  const paid = (payouts ?? []).filter((p: any) => p.status === "paid");
  const lifetimeWash = paid.filter((p: any) => p.kind !== "tip").reduce((a: number, p: any) => a + (p.amount_cents ?? 0), 0);
  const lifetimeTip = paid.filter((p: any) => p.kind === "tip").reduce((a: number, p: any) => a + (p.amount_cents ?? 0), 0);
  const lifetime = lifetimeWash + lifetimeTip;

  // Fetch real-time Stripe balance
  let stripeAvailable = 0;
  let stripePending = 0;
  let connected = false;

  const { data: wp } = await supabase
    .from("washer_profiles")
    .select("stripe_account_id")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  if (wp?.stripe_account_id) {
    try {
      const balance = await stripe.balance.retrieve({}, { stripeAccount: wp.stripe_account_id });
      stripeAvailable = balance.available.reduce((a, b) => a + b.amount, 0);
      stripePending = balance.pending.reduce((a, b) => a + b.amount, 0);
      connected = true;
    } catch (e) {
      console.error("Error fetching stripe balance", e);
    }
  }

  return (
    <div className="px-5 pt-10 pb-8">
      <Eyebrow className="!text-bone/60" prefix={null}>
        Wallet
      </Eyebrow>

      <div className="mt-3 bg-sol p-6 text-ink rounded-none">
        <div className="font-mono text-[10px] uppercase opacity-80">Available to Cash Out</div>
        <div className="display tabular text-5xl mt-1">{fmtUSD(stripeAvailable)}</div>
        <div className="text-xs opacity-70 mt-2">
          {stripePending > 0 ? `${fmtUSD(stripePending)} pending settlement` : connected ? "All funds settled" : "Setup payouts to start earning"}
        </div>
        
        <WalletActions />
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
        <Eyebrow className="!text-bone/60" prefix={null}>
          Recent payouts
        </Eyebrow>
        <div className="mt-3 space-y-2">
          {(payouts ?? []).map((p: any) => {
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
                    {new Date(p.created_at).toLocaleDateString([], { month: "short", day: "numeric" })} ·{" "}
                    <span
                      className={
                        p.status === "paid"
                          ? "text-good"
                          : p.status === "reversed"
                          ? "text-bad"
                          : "text-sol"
                      }
                    >
                      {p.status}
                    </span>
                  </div>
                </div>
                <div className={`display tabular ${isTip ? "text-good" : ""}`}>{fmtUSD(p.amount_cents)}</div>
              </div>
            );
          })}
          {(payouts ?? []).length === 0 && (
            <div className="bg-white/5 p-6 text-center text-sm text-bone/60">
              No payouts yet. Complete a job to earn your first transfer.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

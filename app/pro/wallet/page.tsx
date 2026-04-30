import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";
import { WalletActions } from "./WalletActions";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: payouts } = await supabase
    .from("payouts")
    .select("id, amount_cents, status, created_at, booking_id, bookings(services(tier_name))")
    .eq("washer_id", user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(50);

  const lifetime = (payouts ?? []).filter((p) => p.status === "paid").reduce((a, p) => a + (p.amount_cents ?? 0), 0);
  const pending = (payouts ?? []).filter((p) => p.status === "pending").reduce((a, p) => a + (p.amount_cents ?? 0), 0);

  return (
    <div className="px-5 pt-10 pb-8">
      <Eyebrow className="!text-bone/60" prefix={null}>
        Wallet
      </Eyebrow>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="bg-white/5 p-4">
          <div className="font-mono text-[10px] uppercase opacity-60">Pending</div>
          <div className="display tabular text-3xl mt-1">{fmtUSD(pending)}</div>
        </div>
        <div className="bg-sol/15 p-4">
          <div className="font-mono text-[10px] uppercase opacity-60">Lifetime paid</div>
          <div className="display tabular text-3xl mt-1 text-sol">{fmtUSD(lifetime)}</div>
        </div>
      </div>

      <WalletActions />

      <div className="mt-7">
        <Eyebrow className="!text-bone/60" prefix={null}>
          Recent payouts
        </Eyebrow>
        <div className="mt-3 space-y-2">
          {(payouts ?? []).map((p: any) => (
            <div key={p.id} className="bg-white/5 p-3 flex justify-between text-sm">
              <div>
                <div className="font-medium">{p.bookings?.services?.tier_name ?? "Service"}</div>
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
              <div className="display tabular">{fmtUSD(p.amount_cents)}</div>
            </div>
          ))}
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

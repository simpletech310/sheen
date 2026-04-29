import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function EarningsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: payouts } = await supabase
    .from("payouts")
    .select("amount_cents, status, created_at, booking_id, bookings(services(tier_name))")
    .eq("washer_id", user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(20);

  const total = (payouts ?? []).reduce((acc, p: any) => acc + (p.amount_cents ?? 0), 0);
  const pending = (payouts ?? [])
    .filter((p: any) => p.status === "pending")
    .reduce((acc, p: any) => acc + (p.amount_cents ?? 0), 0);

  return (
    <div className="px-5 pt-10 pb-8">
      <Eyebrow className="!text-bone/60" prefix={null}>
        This week
      </Eyebrow>
      <div className="display tabular text-5xl mt-2">{fmtUSD(total)}</div>
      <div className="font-mono text-[11px] text-good uppercase mt-2">↑ 12% vs last week</div>

      <div className="mt-7 grid grid-cols-3 gap-3">
        <div className="bg-white/5 p-4">
          <div className="font-mono text-[10px] uppercase opacity-60">Jobs</div>
          <div className="display tabular text-2xl mt-1">{payouts?.length ?? 0}</div>
        </div>
        <div className="bg-white/5 p-4">
          <div className="font-mono text-[10px] uppercase opacity-60">Pending</div>
          <div className="display tabular text-2xl mt-1">{fmtUSD(pending)}</div>
        </div>
        <div className="bg-cobalt/20 p-4">
          <div className="font-mono text-[10px] uppercase opacity-60">Next payout</div>
          <div className="display tabular text-2xl mt-1">Fri</div>
        </div>
      </div>

      <div className="mt-7 bg-cobalt p-5 rounded-md">
        <div className="font-mono text-[10px] uppercase opacity-80">Instant payout</div>
        <div className="display tabular text-3xl mt-1">{fmtUSD(pending)}</div>
        <div className="text-xs opacity-80 mt-2">→ •••• 8821 · 1.5% fee</div>
        <button className="mt-4 w-full bg-bone text-ink rounded-full py-3 text-sm font-semibold">Cash out now</button>
      </div>

      <div className="mt-7">
        <Eyebrow className="!text-bone/60" prefix={null}>
          Recent jobs
        </Eyebrow>
        <div className="mt-3 space-y-2">
          {(payouts ?? []).map((p: any) => (
            <div key={p.booking_id} className="bg-white/5 p-3 flex justify-between text-sm">
              <div>
                <div>{p.bookings?.services?.tier_name ?? "Service"}</div>
                <div className="text-xs text-bone/50 font-mono mt-1">
                  {new Date(p.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                </div>
              </div>
              <div className="display tabular">{fmtUSD(p.amount_cents)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

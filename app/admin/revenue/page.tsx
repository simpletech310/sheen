import { createServiceClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";
import { RevenueChart } from "@/components/admin/RevenueChart";

export const dynamic = "force-dynamic";

export default async function AdminRevenuePage() {
  const supabase = createServiceClient();
  const since = new Date(Date.now() - 90 * 86400 * 1000).toISOString();

  const [{ data: completed }, { data: payouts }, { data: members }] = await Promise.all([
    supabase
      .from("bookings")
      .select("total_cents, fees_cents, service_cents, completed_at")
      .eq("status", "completed")
      .gte("completed_at", since),
    supabase.from("payouts").select("amount_cents, status").gte("created_at", since),
    supabase
      .from("memberships")
      .select("plan_id, membership_plans(monthly_price_cents)")
      .eq("status", "active"),
  ]);

  const gmv = (completed ?? []).reduce((a, b: any) => a + (b.total_cents ?? 0), 0);
  const platformTake = (completed ?? []).reduce((a, b: any) => a + ((b.fees_cents ?? 0) + Math.round((b.service_cents ?? 0) * 0.22)), 0);
  const paidOut = (payouts ?? []).filter((p) => p.status === "paid").reduce((a, p) => a + (p.amount_cents ?? 0), 0);
  const mrr = (members ?? []).reduce((a, m: any) => a + (m.membership_plans?.monthly_price_cents ?? 0), 0);

  // 90-day daily series
  const daily: Record<string, number> = {};
  for (let i = 89; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400 * 1000);
    daily[d.toISOString().slice(0, 10)] = 0;
  }
  for (const b of completed ?? []) {
    if (!(b as any).completed_at) continue;
    const k = (b as any).completed_at.slice(0, 10);
    if (k in daily) daily[k] += (b as any).total_cents ?? 0;
  }
  const series = Object.entries(daily).map(([date, gmv]) => ({ date: date.slice(5), gmv: gmv / 100 }));

  return (
    <div>
      <Eyebrow>Admin · Revenue</Eyebrow>
      <h1 className="display text-[40px] md:text-[56px] leading-tight mt-3 mb-6">REVENUE · 90D</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        <div className="bg-mist/40 p-5">
          <div className="font-mono text-[10px] uppercase text-smoke">GMV</div>
          <div className="display tabular text-3xl mt-1">{fmtUSD(gmv)}</div>
        </div>
        <div className="bg-royal/15 p-5">
          <div className="font-mono text-[10px] uppercase text-smoke">Platform take</div>
          <div className="display tabular text-3xl mt-1 text-royal">{fmtUSD(platformTake)}</div>
        </div>
        <div className="bg-mist/40 p-5">
          <div className="font-mono text-[10px] uppercase text-smoke">Paid to washers</div>
          <div className="display tabular text-3xl mt-1">{fmtUSD(paidOut)}</div>
        </div>
        <div className="bg-sol/15 p-5">
          <div className="font-mono text-[10px] uppercase text-smoke">MRR (memberships)</div>
          <div className="display tabular text-3xl mt-1">{fmtUSD(mrr)}</div>
        </div>
      </div>

      <Eyebrow>Daily GMV</Eyebrow>
      <div className="mt-3 bg-bone border border-mist p-4">
        <RevenueChart data={series} />
      </div>
    </div>
  );
}

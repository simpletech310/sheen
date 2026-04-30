import { createServiceClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";
import { RevenueChart } from "@/components/admin/RevenueChart";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const supabase = createServiceClient();

  const since30 = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
  const since7 = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
  const sinceToday = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

  const [{ data: completed30 }, { count: customerCount }, { count: washerCount }, { count: activeMembers }] = await Promise.all([
    supabase
      .from("bookings")
      .select("total_cents, fees_cents, completed_at")
      .eq("status", "completed")
      .gte("completed_at", since30),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "customer"),
    supabase.from("washer_profiles").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("memberships").select("*", { count: "exact", head: true }).eq("status", "active"),
  ]);

  const gmv30 = (completed30 ?? []).reduce((a, b: any) => a + (b.total_cents ?? 0), 0);
  const gmv7 = (completed30 ?? [])
    .filter((b: any) => b.completed_at && b.completed_at >= since7)
    .reduce((a, b: any) => a + (b.total_cents ?? 0), 0);
  const gmvToday = (completed30 ?? [])
    .filter((b: any) => b.completed_at && b.completed_at >= sinceToday)
    .reduce((a, b: any) => a + (b.total_cents ?? 0), 0);

  // Build a 30-day daily series for the chart
  const daily: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400 * 1000);
    const k = d.toISOString().slice(0, 10);
    daily[k] = 0;
  }
  for (const b of completed30 ?? []) {
    if (!(b as any).completed_at) continue;
    const k = (b as any).completed_at.slice(0, 10);
    if (k in daily) daily[k] += (b as any).total_cents ?? 0;
  }
  const series = Object.entries(daily).map(([date, gmv]) => ({ date: date.slice(5), gmv: gmv / 100 }));

  return (
    <div>
      <Eyebrow>Today · {new Date().toLocaleDateString()}</Eyebrow>
      <h1 className="display text-[40px] md:text-[64px] leading-tight mt-3 mb-8">PLATFORM OVERVIEW</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        <div className="bg-mist/40 p-5">
          <div className="font-mono text-[10px] uppercase text-smoke">GMV today</div>
          <div className="display tabular text-3xl mt-1">{fmtUSD(gmvToday)}</div>
        </div>
        <div className="bg-mist/40 p-5">
          <div className="font-mono text-[10px] uppercase text-smoke">GMV · 7d</div>
          <div className="display tabular text-3xl mt-1">{fmtUSD(gmv7)}</div>
        </div>
        <div className="bg-royal/15 p-5">
          <div className="font-mono text-[10px] uppercase text-smoke">GMV · 30d</div>
          <div className="display tabular text-3xl mt-1 text-royal">{fmtUSD(gmv30)}</div>
        </div>
        <div className="bg-sol/15 p-5">
          <div className="font-mono text-[10px] uppercase text-smoke">Jobs · 30d</div>
          <div className="display tabular text-3xl mt-1">{(completed30 ?? []).length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-10">
        <div className="bg-mist/40 p-5">
          <div className="font-mono text-[10px] uppercase text-smoke">Customers</div>
          <div className="display tabular text-3xl mt-1">{customerCount ?? 0}</div>
        </div>
        <div className="bg-mist/40 p-5">
          <div className="font-mono text-[10px] uppercase text-smoke">Active washers</div>
          <div className="display tabular text-3xl mt-1">{washerCount ?? 0}</div>
        </div>
        <div className="bg-mist/40 p-5">
          <div className="font-mono text-[10px] uppercase text-smoke">Active memberships (MRR)</div>
          <div className="display tabular text-3xl mt-1">{activeMembers ?? 0}</div>
        </div>
      </div>

      <Eyebrow>Daily GMV — last 30 days</Eyebrow>
      <div className="mt-3 bg-bone border border-mist p-4">
        <RevenueChart data={series} />
      </div>
    </div>
  );
}

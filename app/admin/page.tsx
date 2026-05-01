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

  const [
    { data: completed30 },
    { count: customerCount },
    { count: washerCount },
    { count: activeMembers },
    { count: bigRigVehicles },
    { count: bigRigPros },
    { data: completed30Cats },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("total_cents, fees_cents, completed_at")
      .in("status", ["completed", "funded"])
      .gte("completed_at", since30),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "customer"),
    supabase.from("washer_profiles").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("memberships").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("vehicles").select("*", { count: "exact", head: true }).eq("vehicle_type", "big_rig"),
    supabase
      .from("washer_profiles")
      .select("*", { count: "exact", head: true })
      .eq("can_wash_big_rig", true)
      .eq("status", "active"),
    // Bookings completed in the last 30d, joined to services so we can
    // bucket GMV by category for the breakdown row.
    supabase
      .from("bookings")
      .select("total_cents, completed_at, services(category)")
      .in("status", ["completed", "funded"])
      .gte("completed_at", since30),
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

  // GMV + job counts bucketed by service category for the last 30 days.
  const byCategory: Record<string, { gmv: number; jobs: number }> = {
    auto: { gmv: 0, jobs: 0 },
    home: { gmv: 0, jobs: 0 },
    big_rig: { gmv: 0, jobs: 0 },
  };
  for (const b of (completed30Cats ?? []) as any[]) {
    const cat = b.services?.category ?? "auto";
    if (!byCategory[cat]) byCategory[cat] = { gmv: 0, jobs: 0 };
    byCategory[cat].gmv += b.total_cents ?? 0;
    byCategory[cat].jobs += 1;
  }

  return (
    <div>
      <Eyebrow>Today · {new Date().toLocaleDateString()}</Eyebrow>
      <h1 className="display text-[40px] md:text-[64px] leading-tight mt-3 mb-2">PLATFORM OVERVIEW</h1>
      <div className="h-[3px] w-24 bg-gradient-to-r from-royal to-sol mb-8" />

      {/* Hero KPI strip — bigger Anton numerals, brand accents */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div className="bg-ink text-bone p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
          <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">GMV today</div>
          <div className="display tabular text-[56px] leading-none mt-3">{fmtUSD(gmvToday)}</div>
        </div>
        <div className="bg-royal text-bone p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
          <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">Active washers</div>
          <div className="display tabular text-[56px] leading-none mt-3">{washerCount ?? 0}</div>
        </div>
        <div className="bg-sol text-ink p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-ink" />
          <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">Jobs · 30d</div>
          <div className="display tabular text-[56px] leading-none mt-3">{(completed30 ?? []).length}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <div className="bg-mist/40 p-5">
          <div className="font-mono text-[10px] uppercase text-smoke">GMV · 7d</div>
          <div className="display tabular text-3xl mt-1">{fmtUSD(gmv7)}</div>
        </div>
        <div className="bg-mist/40 p-5">
          <div className="font-mono text-[10px] uppercase text-smoke">GMV · 30d</div>
          <div className="display tabular text-3xl mt-1 text-royal">{fmtUSD(gmv30)}</div>
        </div>
        <div className="bg-mist/40 p-5">
          <div className="font-mono text-[10px] uppercase text-smoke">Customers</div>
          <div className="display tabular text-3xl mt-1">{customerCount ?? 0}</div>
        </div>
        <div className="bg-mist/40 p-5">
          <div className="font-mono text-[10px] uppercase text-smoke">Active members</div>
          <div className="display tabular text-3xl mt-1">{activeMembers ?? 0}</div>
        </div>
      </div>

      {/* Big Rig vertical — separate strip so ops can spot
          rig-side adoption at a glance without scanning the noise. */}
      <Eyebrow>Big rig</Eyebrow>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3 mb-10">
        <div className="bg-royal text-bone p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
          <div className="font-mono text-[10px] uppercase opacity-70">Rigs in garages</div>
          <div className="display tabular text-3xl mt-1">{bigRigVehicles ?? 0}</div>
        </div>
        <div className="bg-ink text-bone p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
          <div className="font-mono text-[10px] uppercase opacity-70">Rig-capable pros</div>
          <div className="display tabular text-3xl mt-1">{bigRigPros ?? 0}</div>
        </div>
        <div className="bg-mist/40 p-5">
          <div className="font-mono text-[10px] uppercase text-smoke">Rig GMV · 30d</div>
          <div className="display tabular text-3xl mt-1 text-royal">
            {fmtUSD(byCategory.big_rig.gmv)}
          </div>
        </div>
        <div className="bg-mist/40 p-5">
          <div className="font-mono text-[10px] uppercase text-smoke">Rig jobs · 30d</div>
          <div className="display tabular text-3xl mt-1">{byCategory.big_rig.jobs}</div>
        </div>
      </div>

      {/* Category breakdown — stacked tabular bars. Cheap & legible. */}
      <Eyebrow>Category mix · 30d</Eyebrow>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 mb-10">
        {[
          { key: "auto", label: "Auto", accent: "bg-royal" },
          { key: "home", label: "Home", accent: "bg-sol" },
          { key: "big_rig", label: "Big rig", accent: "bg-ink" },
        ].map((c) => {
          const totalJobs = (completed30Cats ?? []).length;
          const jobs = byCategory[c.key]?.jobs ?? 0;
          const gmv = byCategory[c.key]?.gmv ?? 0;
          const pct = totalJobs > 0 ? Math.round((jobs / totalJobs) * 100) : 0;
          return (
            <div key={c.key} className="bg-bone border border-mist p-5">
              <div className="flex justify-between items-baseline mb-2">
                <div className="font-mono text-[10px] uppercase tracking-wider text-smoke">
                  {c.label}
                </div>
                <div className="display tabular text-2xl">{fmtUSD(gmv)}</div>
              </div>
              <div className="h-1 bg-mist relative overflow-hidden">
                <div className={`absolute inset-y-0 left-0 ${c.accent}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-xs text-smoke mt-2 tabular">
                <span>{jobs} jobs</span>
                <span>{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>

      <Eyebrow>Daily GMV — last 30 days</Eyebrow>
      <div className="mt-3 bg-bone border border-mist p-4">
        <RevenueChart data={series} />
      </div>
    </div>
  );
}

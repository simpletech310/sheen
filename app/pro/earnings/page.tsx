import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";
import { EarningsChart } from "@/components/pro/EarningsChart";

export const dynamic = "force-dynamic";

function startOfWeek(d: Date) {
  const out = new Date(d);
  const day = out.getDay(); // 0 = Sun
  const diff = (day + 6) % 7; // Monday-aligned
  out.setDate(out.getDate() - diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1);
}

export default async function EarningsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // All-time payouts for this washer. payouts.kind='wash' is the wash earnings,
  // 'tip' is the tip transfer — both count toward earnings.
  const { data: payouts } = await supabase
    .from("payouts")
    .select(
      "id, amount_cents, status, kind, created_at, booking_id, bookings(services(tier_name, category))"
    )
    .eq("washer_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);

  // Treat "earned" as anything not reversed/failed.
  const earned = (payouts ?? []).filter(
    (p: any) => p.status === "paid" || p.status === "pending"
  );

  const sumSince = (since: Date) =>
    earned
      .filter((p: any) => new Date(p.created_at) >= since)
      .reduce((acc, p: any) => acc + (p.amount_cents ?? 0), 0);

  const thisWeek = sumSince(weekStart);
  const thisMonth = sumSince(monthStart);
  const thisYear = sumSince(yearStart);
  const lifetime = earned.reduce((a, p: any) => a + (p.amount_cents ?? 0), 0);
  const tipsThisYear = earned
    .filter((p: any) => p.kind === "tip" && new Date(p.created_at) >= yearStart)
    .reduce((a, p: any) => a + (p.amount_cents ?? 0), 0);
  const jobsThisYear = new Set(
    earned
      .filter((p: any) => p.kind === "wash" && new Date(p.created_at) >= yearStart)
      .map((p: any) => p.booking_id)
  ).size;

  // 12-week trend (Mon-aligned weeks).
  const weeks: { label: string; cents: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const ws = new Date(weekStart);
    ws.setDate(ws.getDate() - i * 7);
    const we = new Date(ws);
    we.setDate(we.getDate() + 7);
    const cents = earned
      .filter((p: any) => {
        const t = new Date(p.created_at);
        return t >= ws && t < we;
      })
      .reduce((a, p: any) => a + (p.amount_cents ?? 0), 0);
    weeks.push({
      label: ws.toLocaleDateString([], { month: "numeric", day: "numeric" }),
      cents,
    });
  }

  const recent = (payouts ?? []).slice(0, 20);

  return (
    <div className="px-5 pt-10 pb-8">
      <Eyebrow className="!text-bone/60" prefix={null}>
        Earnings
      </Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">{fmtUSD(thisWeek)} this week</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-6" />

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/5 p-4">
          <div className="font-mono text-[10px] uppercase opacity-60">This month</div>
          <div className="display tabular text-2xl mt-1">{fmtUSD(thisMonth)}</div>
        </div>
        <div className="bg-white/5 p-4">
          <div className="font-mono text-[10px] uppercase opacity-60">This year</div>
          <div className="display tabular text-2xl mt-1">{fmtUSD(thisYear)}</div>
        </div>
        <div className="bg-sol/15 p-4">
          <div className="font-mono text-[10px] uppercase opacity-60">Lifetime</div>
          <div className="display tabular text-2xl mt-1 text-sol">{fmtUSD(lifetime)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="bg-white/5 p-4">
          <div className="font-mono text-[10px] uppercase opacity-60">
            Jobs · {now.getFullYear()}
          </div>
          <div className="display tabular text-2xl mt-1">{jobsThisYear}</div>
        </div>
        <div className="bg-white/5 p-4">
          <div className="font-mono text-[10px] uppercase opacity-60">
            Tips · {now.getFullYear()}
          </div>
          <div className="display tabular text-2xl mt-1">{fmtUSD(tipsThisYear)}</div>
        </div>
      </div>

      <div className="mt-7">
        <Eyebrow className="!text-bone/60" prefix={null}>
          12-week trend
        </Eyebrow>
        <div className="mt-3 bg-white/5 p-4">
          {earned.length === 0 ? (
            <div className="text-center text-bone/60 text-sm py-12">
              Complete your first job to start tracking earnings.
            </div>
          ) : (
            <EarningsChart data={weeks} />
          )}
        </div>
      </div>

      <div className="mt-7">
        <Eyebrow className="!text-bone/60" prefix={null}>
          Recent payouts
        </Eyebrow>
        <div className="mt-3 space-y-2">
          {recent.map((p: any) => (
            <div key={p.id} className="bg-white/5 p-3 flex justify-between text-sm">
              <div>
                <div className="font-medium flex items-center gap-2">
                  {p.bookings?.services?.tier_name ?? "Service"}
                  {p.kind === "tip" && (
                    <span className="font-mono text-[9px] uppercase tracking-wider bg-sol text-ink px-1.5 py-0.5">
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
              <div className="display tabular">{fmtUSD(p.amount_cents)}</div>
            </div>
          ))}
          {recent.length === 0 && (
            <div className="bg-white/5 p-6 text-center text-sm text-bone/60">
              No payouts yet.
            </div>
          )}
        </div>
      </div>

      <Link
        href="/pro/wallet"
        className="mt-6 block w-full text-center bg-sol text-ink py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-bone transition"
      >
        Manage wallet &amp; instant payout →
      </Link>
    </div>
  );
}

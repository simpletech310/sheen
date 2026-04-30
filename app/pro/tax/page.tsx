import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { createClient } from "@/lib/supabase/server";
import { fmtUSD } from "@/lib/pricing";
import { StripeDashboardLink } from "./StripeDashboardLink";

export const dynamic = "force-dynamic";

export default async function TaxPage({
  searchParams,
}: {
  searchParams: { year?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? "";

  const now = new Date();
  const requestedYear = Number(searchParams.year) || now.getFullYear();
  const yearStart = new Date(requestedYear, 0, 1).toISOString();
  const yearEnd = new Date(requestedYear + 1, 0, 1).toISOString();

  // All payouts in the requested year — bucket wash vs tip.
  const { data: payouts } = await supabase
    .from("payouts")
    .select("amount_cents, kind, status, created_at")
    .eq("washer_id", userId)
    .gte("created_at", yearStart)
    .lt("created_at", yearEnd);

  // All applied/pending penalties in the year — these are withheld from payouts.
  const { data: penalties } = await supabase
    .from("penalties")
    .select("amount_cents, status, created_at")
    .eq("user_id", userId)
    .eq("party", "washer")
    .in("status", ["applied", "pending"])
    .gte("created_at", yearStart)
    .lt("created_at", yearEnd);

  const washCents = (payouts ?? [])
    .filter((p: any) => p.kind !== "tip")
    .reduce((a, p: any) => a + (p.amount_cents ?? 0), 0);
  const tipCents = (payouts ?? [])
    .filter((p: any) => p.kind === "tip")
    .reduce((a, p: any) => a + (p.amount_cents ?? 0), 0);
  const grossCents = washCents + tipCents;
  const penaltyCents = (penalties ?? []).reduce(
    (a, p: any) => a + (p.amount_cents ?? 0),
    0
  );
  const netCents = grossCents - penaltyCents;

  const jobsCount = (payouts ?? []).filter((p: any) => p.kind !== "tip").length;
  const dates = (payouts ?? [])
    .map((p: any) => p.created_at)
    .filter(Boolean)
    .sort();
  const firstJob = dates[0];
  const lastJob = dates[dates.length - 1];

  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  // Stripe profile to know whether the dashboard link will work.
  const { data: profile } = await supabase
    .from("washer_profiles")
    .select("stripe_account_id")
    .eq("user_id", userId)
    .maybeSingle();

  return (
    <div className="px-5 pt-10 pb-8">
      <Link href="/pro" className="text-bone/60 text-sm">
        ← Home
      </Link>
      <Eyebrow className="!text-bone/60 mt-4" prefix={null}>
        Tax · {requestedYear}
      </Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">YOUR EARNINGS</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-6" />

      {/* Year picker */}
      <div className="flex gap-2 mb-6">
        {years.map((y) => (
          <Link
            key={y}
            href={`/pro/tax?year=${y}`}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wide ${
              y === requestedYear
                ? "bg-sol text-ink"
                : "bg-white/5 text-bone/60 hover:bg-white/10"
            }`}
          >
            {y}
          </Link>
        ))}
      </div>

      {/* Hero number */}
      <div className="bg-royal text-bone p-6 mb-3 relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
        <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">
          Take-home {requestedYear}
        </div>
        <div className="display tabular text-[56px] leading-none mt-3">
          {fmtUSD(netCents)}
        </div>
        <div className="text-xs opacity-80 mt-2 tabular">
          Across {jobsCount} job{jobsCount === 1 ? "" : "s"}
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        <div className="bg-white/5 p-4">
          <div className="font-mono text-[10px] uppercase opacity-60">Wash earnings</div>
          <div className="display tabular text-2xl mt-1">{fmtUSD(washCents)}</div>
        </div>
        <div className="bg-white/5 p-4">
          <div className="font-mono text-[10px] uppercase opacity-60">Tips</div>
          <div className="display tabular text-2xl mt-1 text-sol">{fmtUSD(tipCents)}</div>
        </div>
        <div className="bg-white/5 p-4">
          <div className="font-mono text-[10px] uppercase opacity-60">Gross paid</div>
          <div className="display tabular text-2xl mt-1">{fmtUSD(grossCents)}</div>
        </div>
        <div className="bg-bad/10 p-4 border-l-2 border-bad">
          <div className="font-mono text-[10px] uppercase opacity-60">Fees withheld</div>
          <div className="display tabular text-2xl mt-1 text-bad">
            −{fmtUSD(penaltyCents)}
          </div>
        </div>
      </div>

      {(firstJob || lastJob) && (
        <div className="bg-white/5 p-4 mb-6 grid grid-cols-2 gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase opacity-60">First job</div>
            <div className="text-sm tabular mt-1">
              {firstJob
                ? new Date(firstJob).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—"}
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase opacity-60">Last job</div>
            <div className="text-sm tabular mt-1">
              {lastJob
                ? new Date(lastJob).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—"}
            </div>
          </div>
        </div>
      )}

      {/* Payments dashboard deep-link — our payments processor
          generates the actual 1099-K. */}
      <Eyebrow className="!text-bone/60" prefix={null}>
        Tax forms
      </Eyebrow>
      <div className="mt-3 bg-white/5 p-5">
        <p className="text-sm text-bone/85 leading-relaxed">
          Your <span className="font-bold">1099-K</span> is prepared and delivered
          by our payments partner. Open your payouts dashboard to download tax
          documents and update your tax profile.
        </p>
        <StripeDashboardLink connected={!!profile?.stripe_account_id} />
      </div>

      <p className="text-[11px] text-bone/40 mt-6 leading-relaxed">
        Sheen does not file taxes for you. This summary is for your records.
        Numbers reflect platform payouts only — refer to your payouts dashboard
        for the official 1099-K.
      </p>
    </div>
  );
}

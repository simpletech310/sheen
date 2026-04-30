import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Wordmark } from "@/components/brand/Wordmark";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";
import { ConnectStandardButton } from "./ConnectStandardButton";

export const dynamic = "force-dynamic";

export default async function PartnerDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/partner/dashboard");

  const { data: partner } = await supabase
    .from("partner_profiles")
    .select("business_name, slug, status, jobs_completed, rating_avg, stripe_account_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: jobs } = await supabase
    .from("bookings")
    .select("id, status, total_cents, scheduled_window_start, services(tier_name), addresses(city)")
    .eq("assigned_partner_id", user.id)
    .order("scheduled_window_start", { ascending: true })
    .limit(20);

  const total = (jobs ?? []).reduce((acc, j: any) => acc + (j.total_cents ?? 0), 0);
  const connected = !!partner?.stripe_account_id;

  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex w-64 bg-ink text-bone flex-col p-6">
        <Wordmark size={26} invert />
        <div className="font-mono text-[10px] uppercase opacity-60 mt-2">
          Partner · {partner?.business_name ?? "—"}
        </div>
        <nav className="mt-10 space-y-1 text-sm">
          {[
            { l: "Overview", h: "/partner/dashboard", active: true },
            { l: "Job board", h: "#" },
            { l: "Schedule", h: "#" },
            { l: "Earnings", h: "#" },
            { l: "Profile page", h: partner?.slug ? `/p/${partner.slug}` : "#" },
            { l: "Settings", h: "#" },
          ].map((n) => (
            <Link
              key={n.l}
              href={n.h}
              className={`block py-2 px-3 ${n.active ? "bg-bone/10 text-bone" : "text-bone/60 hover:text-bone"}`}
            >
              {n.l}
            </Link>
          ))}
        </nav>
        <div className="mt-auto text-xs text-bone/40">
          Status:{" "}
          <span className={partner?.status === "active" ? "text-good" : "text-sol"}>
            {partner?.status ?? "—"}
          </span>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-12 bg-bone">
        <Eyebrow>Today · {new Date().toLocaleDateString()}</Eyebrow>
        <h1 className="display text-[40px] md:text-[64px] leading-tight mt-3 mb-8">
          {partner?.status === "active"
            ? `GOOD MORNING, ${partner.business_name?.toUpperCase()}.`
            : "APPLICATION UNDER REVIEW."}
        </h1>

        {!connected && partner && (
          <div className="bg-sol p-6 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="font-bold uppercase text-sm">Connect to Stripe</div>
              <div className="text-xs mt-1 max-w-md">
                Set up your Stripe Standard account to receive payouts directly. We&rsquo;ll route bookings to your
                connected account with our 12% application fee.
              </div>
            </div>
            <ConnectStandardButton />
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          <div className="bg-mist/40 p-5">
            <div className="font-mono text-[10px] uppercase text-smoke">This week gross</div>
            <div className="display tabular text-3xl mt-1">{fmtUSD(total)}</div>
          </div>
          <div className="bg-mist/40 p-5">
            <div className="font-mono text-[10px] uppercase text-smoke">Jobs scheduled</div>
            <div className="display tabular text-3xl mt-1">{jobs?.length ?? 0}</div>
          </div>
          <div className="bg-mist/40 p-5">
            <div className="font-mono text-[10px] uppercase text-smoke">Rating · 30d</div>
            <div className="display tabular text-3xl mt-1">{partner?.rating_avg ?? "—"} ★</div>
          </div>
          <div className="bg-royal/15 p-5">
            <div className="font-mono text-[10px] uppercase text-smoke">All-time jobs</div>
            <div className="display tabular text-3xl mt-1">{partner?.jobs_completed ?? 0}</div>
          </div>
        </div>

        <Eyebrow>Job board</Eyebrow>
        <div className="mt-3 space-y-2">
          {(jobs ?? []).length === 0 && (
            <div className="bg-mist/40 p-6 text-sm text-smoke">
              No jobs assigned yet. Once your application is approved, overflow leads will route here.
            </div>
          )}
          {(jobs ?? []).map((j: any) => (
            <div key={j.id} className="bg-bone border border-mist p-4 flex justify-between items-center">
              <div>
                <div className="text-sm font-bold">{j.services?.tier_name}</div>
                <div className="text-xs text-smoke">
                  {j.addresses?.city} ·{" "}
                  {new Date(j.scheduled_window_start).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                  })}
                </div>
              </div>
              <div className="display tabular text-2xl">{fmtUSD(j.total_cents)}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

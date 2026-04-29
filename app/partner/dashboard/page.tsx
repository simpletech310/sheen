import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Wordmark } from "@/components/brand/Wordmark";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function PartnerDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: partner } = await supabase
    .from("partner_profiles")
    .select("business_name, slug, status, jobs_completed, rating_avg")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  const { data: jobs } = await supabase
    .from("bookings")
    .select("id, status, total_cents, scheduled_window_start, services(tier_name), addresses(city)")
    .eq("assigned_partner_id", user?.id ?? "")
    .order("scheduled_window_start", { ascending: true })
    .limit(20);

  const total = (jobs ?? []).reduce((acc, j: any) => acc + (j.total_cents ?? 0), 0);

  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex w-64 bg-ink text-bone flex-col p-6">
        <Wordmark size={24} invert />
        <div className="font-mono text-[10px] uppercase opacity-60 mt-2">
          Partner · {partner?.business_name ?? "—"}
        </div>
        <nav className="mt-10 space-y-1 text-sm">
          {[
            { l: "Overview", h: "/partner/dashboard", active: true },
            { l: "Job board", h: "#" },
            { l: "Schedule", h: "#" },
            { l: "Crew", h: "#" },
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
          <span className={partner?.status === "active" ? "text-good" : "text-wax"}>
            {partner?.status ?? "—"}
          </span>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-12 bg-bone">
        <Eyebrow>Today · {new Date().toLocaleDateString()}</Eyebrow>
        <h1 className="display text-[40px] md:text-[56px] leading-tight mt-3 mb-8">
          {partner?.status === "active" ? `Good morning, ${partner.business_name}.` : "Application under review."}
        </h1>

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
          <div className="bg-cobalt/15 p-5">
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
                <div className="text-sm font-semibold">{j.services?.tier_name}</div>
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

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";
import { ProJobsFilterClient, ProJob } from "./ProJobsFilterClient";

export const dynamic = "force-dynamic";

const ACTIVE = ["matched", "en_route", "arrived", "in_progress"];

function startOfWeekMon(d = new Date()) {
  const out = new Date(d);
  const dow = out.getDay(); // 0=Sun
  const delta = (dow + 6) % 7; // shift to Mon
  out.setDate(out.getDate() - delta);
  out.setHours(0, 0, 0, 0);
  return out;
}

export default async function ProDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? "";

  // Profile + identity
  const [{ data: profile }, { data: me }] = await Promise.all([
    supabase
      .from("washer_profiles")
      .select(
        "status, stripe_account_id, insurance_doc_url, insurance_expires_at, background_check_status, background_check_verified, rating_avg, jobs_completed, wash_handle"
      )
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("users").select("full_name").eq("id", userId).maybeSingle(),
  ]);
  const firstName = (me?.full_name ?? user?.email ?? "Pro")
    .split(" ")[0]
    .split("@")[0];

  // Recent jobs (active + history)
  const { data: allJobs } = await supabase
    .from("bookings")
    .select(
      "id, status, scheduled_window_start, total_cents, service_cents, services(tier_name, category), addresses(street, city)"
    )
    .eq("assigned_washer_id", userId)
    .order("scheduled_window_start", { ascending: false })
    .limit(50);
  
  // For the hero strip, we still count today's active jobs
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const todayJobs = (allJobs ?? []).filter(j => 
    ACTIVE.includes(j.status) &&
    new Date(j.scheduled_window_start) >= todayStart &&
    new Date(j.scheduled_window_start) < todayEnd
  );

  // This-week earnings (Mon-aligned, payouts.amount_cents on completed jobs)
  const weekStart = startOfWeekMon();
  const { data: weekPayouts } = await supabase
    .from("payouts")
    .select("amount_cents, kind, created_at")
    .eq("washer_id", userId)
    .gte("created_at", weekStart.toISOString());
  const weekTotal = (weekPayouts ?? []).reduce(
    (a, p: any) => a + (p.amount_cents ?? 0),
    0
  );
  const weekTips = (weekPayouts ?? [])
    .filter((p: any) => p.kind === "tip")
    .reduce((a, p: any) => a + (p.amount_cents ?? 0), 0);
  const weekJobs = (weekPayouts ?? []).filter((p: any) => p.kind !== "tip").length;

  // Action items
  const actions: { label: string; href: string; tone: "sol" | "royal" | "bad" }[] = [];
  if (!profile?.stripe_account_id) {
    actions.push({
      label: "Set up payouts so you can get paid",
      href: "/pro/verify",
      tone: "sol",
    });
  }
  const insuranceMissing = !profile?.insurance_doc_url;
  const insuranceExpiringSoon =
    profile?.insurance_expires_at &&
    new Date(profile.insurance_expires_at).getTime() - Date.now() <
      30 * 86400 * 1000;
  if (insuranceMissing) {
    actions.push({
      label: "Upload proof of insurance",
      href: "/pro/verify",
      tone: "sol",
    });
  } else if (insuranceExpiringSoon) {
    actions.push({
      label: "Insurance expiring soon — replace before it lapses",
      href: "/pro/verify",
      tone: "bad",
    });
  }
  if (profile?.background_check_status !== "verified") {
    actions.push({
      label:
        profile?.background_check_status === "pending"
          ? "Background check in review (24–48h)"
          : "Submit for background check",
      href: "/pro/verify",
      tone: "royal",
    });
  }

  // Outstanding penalties
  const { data: penalties } = await supabase
    .from("penalties")
    .select("amount_cents, status")
    .eq("user_id", userId)
    .eq("party", "washer")
    .in("status", ["applied", "pending"]);
  const penaltyCents = (penalties ?? []).reduce(
    (a, p: any) => a + (p.amount_cents ?? 0),
    0
  );
  if (penaltyCents > 0) {
    actions.push({
      label: `${fmtUSD(penaltyCents)} in outstanding fees`,
      href: "/pro/penalties",
      tone: "bad",
    });
  }

  // Recent reviews preview
  const { data: recentReviews } = await supabase
    .from("reviews")
    .select("rating_int, comment, created_at")
    .eq("reviewee_id", userId)
    .order("created_at", { ascending: false })
    .limit(3);

  const verified = profile?.status === "active" && profile?.background_check_verified;

  return (
    <div className="pb-8">
      {/* Hero strip */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/img/washer.jpg)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-royal/85 via-ink/85 to-ink" />
        <div className="relative px-5 pt-10 pb-9 text-bone">
          <Eyebrow className="!text-sol" prefix="──">
            Hi, {firstName}
          </Eyebrow>
          <h1 className="display text-[36px] leading-[0.95] mt-4">
            {todayJobs && todayJobs.length > 0 ? (
              <>
                You have{" "}
                <span className="text-sol">
                  {todayJobs.length} job{todayJobs.length === 1 ? "" : "s"}
                </span>{" "}
                today.
              </>
            ) : (
              <>
                Ready to <span className="text-sol">work?</span>
              </>
            )}
          </h1>
          <div className="mt-5 flex gap-6 text-xs">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">
                Status
              </div>
              <div className="display tabular text-xl mt-0.5">
                {verified ? "Active" : "Pending"}
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">
                Lifetime jobs
              </div>
              <div className="display tabular text-xl mt-0.5">
                {profile?.jobs_completed ?? 0}
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">
                Rating
              </div>
              <div className="display tabular text-xl mt-0.5">
                {profile?.rating_avg ?? "—"}
                <span className="text-sol ml-1">★</span>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-sol" />
      </div>

      <div className="px-5 pt-6">
        {/* Action items */}
        {actions.length > 0 && (
          <div className="mb-6">
            <Eyebrow className="!text-bone/60" prefix={null}>
              Action items
            </Eyebrow>
            <div className="mt-3 space-y-2">
              {actions.map((a, i) => (
                <Link
                  key={i}
                  href={a.href}
                  className={`block p-4 transition border-l-2 ${
                    a.tone === "bad"
                      ? "bg-bad/15 border-bad hover:bg-bad/25"
                      : a.tone === "royal"
                      ? "bg-royal/15 border-royal hover:bg-royal/25"
                      : "bg-sol/15 border-sol hover:bg-sol/25"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-bone">{a.label}</span>
                    <span className="text-bone/60">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Jobs List */}
        <Eyebrow className="!text-bone/60" prefix={null}>
          Your Jobs
        </Eyebrow>
        <div className="mt-3 mb-6">
          <ProJobsFilterClient jobs={(allJobs as ProJob[]) ?? []} />
        </div>

        {/* This week earnings */}
        <Eyebrow className="!text-bone/60" prefix={null}>
          This week
        </Eyebrow>
        <div className="mt-3 mb-6 grid grid-cols-3 gap-2">
          <div className="bg-white/5 p-4">
            <div className="font-mono text-[10px] uppercase opacity-60">Earned</div>
            <div className="display tabular text-2xl mt-1 text-sol">
              {fmtUSD(weekTotal)}
            </div>
          </div>
          <div className="bg-white/5 p-4">
            <div className="font-mono text-[10px] uppercase opacity-60">Jobs</div>
            <div className="display tabular text-2xl mt-1">{weekJobs}</div>
          </div>
          <div className="bg-white/5 p-4">
            <div className="font-mono text-[10px] uppercase opacity-60">Tips</div>
            <div className="display tabular text-2xl mt-1">{fmtUSD(weekTips)}</div>
          </div>
        </div>

        {/* Recent reviews preview */}
        {recentReviews && recentReviews.length > 0 && (
          <>
            <div className="flex justify-between items-baseline">
              <Eyebrow className="!text-bone/60" prefix={null}>
                Recent reviews
              </Eyebrow>
              <Link
                href="/pro/reviews"
                className="text-[10px] uppercase text-sol hover:underline"
              >
                See all →
              </Link>
            </div>
            <div className="mt-3 mb-6 space-y-2">
              {recentReviews.map((r: any, i: number) => (
                <div key={i} className="bg-white/5 p-3">
                  <div className="flex justify-between items-baseline">
                    <div className="text-sol text-sm">
                      {"★".repeat(r.rating_int)}
                      <span className="text-bone/50">
                        {"★".repeat(5 - r.rating_int)}
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-bone/70">
                      {new Date(r.created_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                  {r.comment && (
                    <p className="text-xs text-bone/90 mt-1.5 line-clamp-2">
                      {r.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Quick links */}
        <Eyebrow className="!text-bone/60" prefix={null}>
          Quick links
        </Eyebrow>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link href="/pro/queue" className="bg-white/5 p-4 text-sm hover:bg-white/10">
            Queue →
          </Link>
          <Link
            href="/pro/availability"
            className="bg-white/5 p-4 text-sm hover:bg-white/10"
          >
            Schedule →
          </Link>
          <Link
            href="/pro/messages"
            className="bg-white/5 p-4 text-sm hover:bg-white/10"
          >
            Inbox →
          </Link>
          <Link
            href="/pro/earnings"
            className="bg-white/5 p-4 text-sm hover:bg-white/10"
          >
            Earnings →
          </Link>
        </div>
      </div>
    </div>
  );
}

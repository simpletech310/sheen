import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";
import { computeFees } from "@/lib/stripe/fees";
import { distanceMiles } from "@/lib/mapbox";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Washer profile + availability
  const { data: profile } = await supabase
    .from("washer_profiles")
    .select("status, service_radius_miles, base_lat, base_lng")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  const { data: avail } = await supabase
    .from("availability")
    .select("day_of_week, start_time, end_time, specific_date, blocked")
    .eq("washer_id", user?.id ?? "");

  const { data: jobsRaw } = await supabase
    .from("bookings")
    .select(
      "id, scheduled_window_start, service_cents, total_cents, services(tier_name, category), addresses(street, city, lat, lng)"
    )
    .eq("status", "pending")
    .is("assigned_washer_id", null)
    .order("scheduled_window_start", { ascending: true })
    .limit(40);

  const myLat = profile?.base_lat ? Number(profile.base_lat) : null;
  const myLng = profile?.base_lng ? Number(profile.base_lng) : null;
  const radius = profile?.service_radius_miles ?? 5;

  // Filter jobs: must fall inside an availability window AND within radius (if we know either)
  const jobs = (jobsRaw ?? []).filter((j: any) => {
    const start = new Date(j.scheduled_window_start);
    if (avail && avail.length) {
      const day = start.getDay();
      const time = start.toTimeString().slice(0, 8);
      const dateStr = start.toISOString().slice(0, 10);
      const blockedToday = avail.some((a) => a.specific_date === dateStr && a.blocked);
      if (blockedToday) return false;
      const recurring = avail.filter((a) => a.day_of_week === day && !a.blocked);
      if (recurring.length === 0) return false;
      const inWindow = recurring.some(
        (a) => a.start_time && a.end_time && time >= a.start_time && time <= a.end_time
      );
      if (!inWindow) return false;
    }
    if (myLat && myLng && j.addresses?.lat && j.addresses?.lng) {
      const d = distanceMiles(
        { lat: myLat, lng: myLng },
        { lat: Number(j.addresses.lat), lng: Number(j.addresses.lng) }
      );
      if (d > radius) return false;
    }
    return true;
  });

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex justify-between items-center mb-6">
        <Eyebrow className="!text-bone/60" prefix={null}>
          Available · {radius} mi radius
        </Eyebrow>
        <Link href="/pro/availability" className="text-[10px] text-bone/60 underline uppercase tracking-wide">
          Hours
        </Link>
      </div>
      <h1 className="display text-3xl mb-6">QUEUE</h1>

      {profile?.status !== "active" && (
        <Link
          href="/pro/onboard"
          className="block bg-sol text-ink p-4 mb-5 hover:bg-bone"
        >
          <div className="font-bold uppercase text-sm">Finish onboarding</div>
          <div className="text-xs mt-1">
            Status: {profile?.status ?? "pending"} — set up Stripe + insurance to start receiving jobs.
          </div>
        </Link>
      )}

      {jobs && jobs.length > 0 ? (
        <div className="space-y-3">
          {jobs.map((j: any) => {
            const net = computeFees({ serviceCents: j.service_cents, routedTo: "solo_washer" }).washerOrPartnerNet;
            const dist =
              myLat && myLng && j.addresses?.lat && j.addresses?.lng
                ? distanceMiles(
                    { lat: myLat, lng: myLng },
                    { lat: Number(j.addresses.lat), lng: Number(j.addresses.lng) }
                  ).toFixed(1)
                : null;
            return (
              <Link
                key={j.id}
                href={`/pro/queue/${j.id}`}
                className="block bg-white/5 hover:bg-white/10 p-4 transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-bold uppercase">{j.services?.tier_name ?? "Service"}</div>
                    <div className="text-xs text-bone/60 mt-1">
                      {j.addresses?.street}, {j.addresses?.city}
                      {dist ? ` · ${dist} mi` : ""}
                    </div>
                    <div className="font-mono text-[10px] text-bone/50 uppercase mt-1.5 tabular">
                      {new Date(j.scheduled_window_start).toLocaleString([], {
                        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="display tabular text-2xl text-sol">{fmtUSD(net)}</div>
                    <div className="font-mono text-[10px] text-bone/50">YOU GET</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-white/5 p-6 text-center text-sm text-bone/60">
          No jobs in your radius right now. Check back soon.
        </div>
      )}
    </div>
  );
}

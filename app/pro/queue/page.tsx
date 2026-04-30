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
      "id, scheduled_window_start, service_cents, total_cents, vehicle_count, requested_washer_id, request_expires_at, services(tier_name, category), addresses(street, city, lat, lng)"
    )
    .eq("status", "pending")
    .is("assigned_washer_id", null)
    .order("scheduled_window_start", { ascending: true })
    .limit(40);

  // Active direct requests for this washer (RLS already lets them see
  // these via the requested_washer_id branch in the queue policy).
  const now = Date.now();
  const directRequests = (jobsRaw ?? []).filter(
    (j: any) =>
      j.requested_washer_id === user?.id &&
      j.request_expires_at &&
      new Date(j.request_expires_at).getTime() > now
  );
  const directRequestIds = new Set(directRequests.map((j: any) => j.id));

  const myLat = profile?.base_lat ? Number(profile.base_lat) : null;
  const myLng = profile?.base_lng ? Number(profile.base_lng) : null;
  const radius = profile?.service_radius_miles ?? 5;

  // Filter jobs: must fall inside an availability window AND within radius (if we know either).
  // Direct requests for THIS washer are surfaced separately above the queue,
  // so exclude them from the general list to avoid duplicates.
  const jobs = (jobsRaw ?? []).filter((j: any) => {
    if (directRequestIds.has(j.id)) return false;
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
    <div className="pb-8">
      {/* Sticky header so the queue is always anchored when scrolling jobs. */}
      <div className="sticky top-0 z-20 bg-ink/95 backdrop-blur supports-[backdrop-filter]:bg-ink/80 px-5 pt-6 pb-4 -mt-px border-b border-bone/10">
        <div className="flex justify-between items-center mb-2">
          <Eyebrow className="!text-bone/60" prefix={null}>
            Available · {radius} mi radius · {jobs.length} job{jobs.length === 1 ? "" : "s"}
          </Eyebrow>
          <Link href="/pro/availability" className="text-[10px] text-bone/60 underline uppercase tracking-wide">
            Hours
          </Link>
        </div>
        <h1 className="display text-3xl">QUEUE</h1>
      </div>

      <div className="px-5 pt-5">

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

      {directRequests.length > 0 && (
        <div className="mb-6 -mx-1">
          <div className="px-1 mb-2 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-sol animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-sol">
              Requested for you · respond before they expire
            </span>
          </div>
          <div className="space-y-2">
            {directRequests.map((j: any) => {
              const net = computeFees({ serviceCents: j.service_cents, routedTo: "solo_washer" })
                .washerOrPartnerNet;
              const expiresMs = new Date(j.request_expires_at).getTime();
              const minsLeft = Math.max(0, Math.ceil((expiresMs - now) / 60000));
              return (
                <Link
                  key={j.id}
                  href={`/pro/queue/${j.id}`}
                  className="block border border-sol bg-sol/10 p-4 hover:bg-sol/20 transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-sol mb-1">
                        Direct request · {minsLeft} min left
                      </div>
                      <div className="text-sm font-bold uppercase">
                        {j.services?.tier_name ?? "Service"}
                        {j.vehicle_count > 1 && (
                          <span className="ml-2 font-mono text-[10px] tracking-wider text-sol">
                            × {j.vehicle_count}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-bone/70 mt-1">
                        {j.addresses?.street}, {j.addresses?.city}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="display tabular text-2xl text-sol">{fmtUSD(net)}</div>
                      <div className="font-mono text-[10px] text-bone/60">YOU GET</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
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
            const category = j.services?.category ?? "auto";
            const isHome = category === "home";
            return (
              <Link
                key={j.id}
                href={`/pro/queue/${j.id}`}
                className={`block p-4 transition border-l-2 ${
                  isHome
                    ? "bg-sol/10 hover:bg-sol/15 border-sol"
                    : "bg-white/5 hover:bg-white/10 border-royal"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 ${
                      isHome ? "bg-sol text-ink" : "bg-royal text-bone"
                    }`}
                  >
                    {isHome ? "Home" : "Auto"}
                  </span>
                  {j.vehicle_count > 1 && !isHome && (
                    <span className="font-mono text-[9px] uppercase tracking-wider bg-bone/20 text-bone px-1.5 py-0.5">
                      × {j.vehicle_count} vehicles
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-bold uppercase">
                      {j.services?.tier_name ?? "Service"}
                    </div>
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
        <div className="relative overflow-hidden">
          <div
            className="aspect-[16/9] bg-cover bg-center"
            style={{ backgroundImage: "url(/img/og-default.jpg)" }}
          />
          <div className="absolute inset-0 bg-ink/65 flex flex-col items-center justify-center text-center px-6">
            <div className="font-mono text-[10px] uppercase tracking-wider text-sol mb-2">
              Quiet right now
            </div>
            <h2 className="display text-xl text-bone mb-1">No jobs in your radius</h2>
            <p className="text-xs text-bone/70 max-w-xs">
              Bookings come in throughout the day. We&rsquo;ll push you when something matches.
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

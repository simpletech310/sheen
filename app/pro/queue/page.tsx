import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import Link from "next/link";
import { distanceMiles } from "@/lib/mapbox";
import { QueueRealtimeClient, type QueueJob } from "./QueueRealtimeClient";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Washer profile + availability
  const { data: profile } = await supabase
    .from("washer_profiles")
    .select("status, service_radius_miles, base_lat, base_lng, can_wash_big_rig")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();
  const canWashBigRig = !!profile?.can_wash_big_rig;

  const { data: avail } = await supabase
    .from("availability")
    .select("day_of_week, start_time, end_time, specific_date, blocked")
    .eq("washer_id", user?.id ?? "");

  const { data: jobsRaw } = await supabase
    .from("bookings")
    .select(
      "id, status, assigned_washer_id, scheduled_window_start, service_cents, vehicle_count, requested_washer_id, request_expires_at, request_declined_at, is_rush, rush_deadline, rush_bonus_cents, services(tier_name, category), addresses(street, city, lat, lng)"
    )
    .eq("status", "pending")
    .is("assigned_washer_id", null)
    .order("is_rush", { ascending: false })
    .order("scheduled_window_start", { ascending: true })
    .limit(40);

  const now = Date.now();
  const myLat = profile?.base_lat ? Number(profile.base_lat) : null;
  const myLng = profile?.base_lng ? Number(profile.base_lng) : null;
  const radius = profile?.service_radius_miles ?? 5;

  const directRequests = (jobsRaw ?? []).filter(
    (j: any) =>
      j.requested_washer_id === user?.id &&
      j.request_expires_at &&
      new Date(j.request_expires_at).getTime() > now
  ) as QueueJob[];

  const directRequestIds = new Set(directRequests.map((j) => j.id));

  const jobs = (jobsRaw ?? []).filter((j: any) => {
    if (directRequestIds.has(j.id)) return false;
    if (j.services?.category === "big_rig" && !canWashBigRig) return false;
    const isRush = !!j.is_rush;
    const start = new Date(j.scheduled_window_start);
    if (!isRush && avail && avail.length) {
      const day = start.getDay();
      const time = start.toTimeString().slice(0, 8);
      const dateStr = start.toISOString().slice(0, 10);
      const blockedToday = avail.some((a) => a.specific_date === dateStr && a.blocked);
      if (blockedToday) return false;
      const recurring = avail.filter((a) => a.day_of_week === day && !a.blocked);
      if (recurring.length === 0) return false;
      const inWindow = recurring.some(
        (a) =>
          a.start_time &&
          a.end_time &&
          time >= a.start_time &&
          time <= a.end_time
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
  }) as QueueJob[];

  return (
    <div className="pb-8">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-ink/95 backdrop-blur supports-[backdrop-filter]:bg-ink/80 px-5 pt-6 pb-4 -mt-px border-b border-bone/10">
        <div className="flex justify-between items-center mb-2">
          <Eyebrow className="!text-bone/75" prefix={null}>
            Available · {radius} mi radius · live
          </Eyebrow>
          <Link
            href="/pro/availability"
            className="text-[10px] text-bone/75 underline uppercase tracking-wide"
          >
            Hours
          </Link>
        </div>
        <h1 className="display text-3xl">QUEUE</h1>
      </div>

      {profile?.status !== "active" && (
        <div className="px-5 pt-5">
          <Link
            href="/pro/onboard"
            className="block bg-sol text-ink p-4 mb-5 hover:bg-bone"
          >
            <div className="font-bold uppercase text-sm">Finish onboarding</div>
            <div className="text-xs mt-1">
              Status: {profile?.status ?? "pending"} — finish payouts + insurance to
              start receiving jobs.
            </div>
          </Link>
        </div>
      )}

      {/* Real-time client takes over from here */}
      <QueueRealtimeClient
        initialJobs={jobs}
        initialDirectRequests={directRequests}
        userId={user?.id ?? ""}
        myLat={myLat}
        myLng={myLng}
        radius={radius}
        canWashBigRig={canWashBigRig}
      />
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import Link from "next/link";
import { distanceMiles } from "@/lib/mapbox";
import { checkWasherEligibility } from "@/lib/job-matching";
import { QueueRealtimeClient, type QueueJob, type WasherCaps } from "./QueueRealtimeClient";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const t = await getTranslations("proQueue");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Washer profile + availability — pull every capability flag so we can
  // pre-filter the queue by what the pro actually has.
  const { data: profile } = await supabase
    .from("washer_profiles")
    .select(
      "status, service_radius_miles, service_areas, base_lat, base_lng, can_wash_big_rig, has_own_water, has_own_power, has_pressure_washer, can_detail_interior, can_do_paint_correction"
    )
    .eq("user_id", user?.id ?? "")
    .maybeSingle();
  const canWashBigRig = !!profile?.can_wash_big_rig;
  const washerCaps: WasherCaps = {
    has_own_water: !!profile?.has_own_water,
    has_own_power: !!profile?.has_own_power,
    has_pressure_washer: !!profile?.has_pressure_washer,
    can_detail_interior: !!profile?.can_detail_interior,
    can_do_paint_correction: !!profile?.can_do_paint_correction,
    can_wash_big_rig: !!profile?.can_wash_big_rig,
  };

  // Availability is read for the "blocked-day" check below — but it is NO
  // LONGER used to silently hide jobs that fall outside the washer's
  // recurring weekly hours. A washer's "Mon-Fri 9-5" should mean "I prefer
  // those hours", not "hide every Saturday job from me forever". The pro
  // can decide for themselves whether to take a job outside their default
  // window. Hard blocks (specific_date.blocked) are still respected.
  const { data: avail } = await supabase
    .from("availability")
    .select("day_of_week, start_time, end_time, specific_date, blocked")
    .eq("washer_id", user?.id ?? "");

  const { data: jobsRaw } = await supabase
    .from("bookings")
    .select(
      "id, status, assigned_washer_id, scheduled_window_start, service_cents, vehicle_count, requested_washer_id, request_expires_at, request_declined_at, is_rush, rush_deadline, rush_bonus_cents, services(tier_name, category, requires_water, requires_power, requires_pressure_washer, requires_paint_correction, requires_interior_detail), addresses(street, city, state, zip, lat, lng, has_water, has_power)"
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
  // Lower-cased for case-insensitive contains() check below. Empty list
  // means "no city override" — fall back to radius-from-base.
  const serviceAreas = ((profile?.service_areas as string[] | null) ?? [])
    .map((c) => c.toLowerCase().trim())
    .filter(Boolean);

  const directRequests = (jobsRaw ?? []).filter(
    (j: any) =>
      j.requested_washer_id === user?.id &&
      j.request_expires_at &&
      new Date(j.request_expires_at).getTime() > now
  ) as unknown as QueueJob[];

  const directRequestIds = new Set(directRequests.map((j) => j.id));

  const jobs = (jobsRaw ?? []).filter((j: any) => {
    if (directRequestIds.has(j.id)) return false;
    // Exclusivity hold: a customer can request a specific pro by handle.
    // For 10 minutes after booking, that booking is locked to the
    // requested washer and must NOT appear in anyone else's queue. Once
    // the window expires, request_expires_at is in the past and the job
    // falls through to the open queue here. Decline also clears the
    // expiry, so a declined-but-not-expired request also drops through.
    const reqExpiry = j.request_expires_at
      ? new Date(j.request_expires_at).getTime()
      : null;
    const heldForSomeoneElse =
      j.requested_washer_id &&
      j.requested_washer_id !== user?.id &&
      reqExpiry &&
      reqExpiry > now &&
      !j.request_declined_at;
    if (heldForSomeoneElse) return false;
    // Capability gate: equipment + site-derived water/power. Hides jobs the
    // washer can't physically complete instead of letting them claim and
    // disappoint the customer.
    const elig = checkWasherEligibility(j.services, j.addresses, washerCaps);
    if (!elig.ok) return false;
    // Only honour explicit "this date is blocked" rows — recurring weekly
    // hours are intentionally NOT used as a filter so we don't silently
    // hide a perfectly fine Saturday job from a washer whose default
    // hours are Mon-Fri. The washer can still skip jobs they don't want.
    const isRush = !!j.is_rush;
    if (!isRush && avail && avail.length) {
      const dateStr = new Date(j.scheduled_window_start).toISOString().slice(0, 10);
      const blockedToday = avail.some((a) => a.specific_date === dateStr && a.blocked);
      if (blockedToday) return false;
    }
    // Reach gate: a job qualifies if EITHER it sits within the
    // radius from the pro's base, OR its city matches one of the
    // explicitly opted-in cities (additive — those override the
    // radius outwards, never inwards). A pro with base in Long Beach
    // and "Riverside" in their cities list sees both LB-area jobs
    // (via radius) AND Riverside jobs (via city), but not jobs in
    // San Diego unless they add it.
    const jobLat = j.addresses?.lat ? Number(j.addresses.lat) : null;
    const jobLng = j.addresses?.lng ? Number(j.addresses.lng) : null;
    const jobCity = (j.addresses?.city ?? "").toLowerCase().trim();
    const inRadius =
      myLat && myLng && jobLat && jobLng
        ? distanceMiles(
            { lat: myLat, lng: myLng },
            { lat: jobLat, lng: jobLng }
          ) <= radius
        : !myLat || !myLng; // no base set → don't gate on distance
    const inCity = serviceAreas.length > 0 && !!jobCity && serviceAreas.includes(jobCity);
    if (!inRadius && !inCity) return false;
    return true;
  }) as unknown as QueueJob[];

  return (
    <div className="pb-8">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-ink/95 backdrop-blur supports-[backdrop-filter]:bg-ink/80 px-5 pt-6 pb-4 -mt-px border-b border-bone/10">
        <div className="flex justify-between items-center mb-2">
          <Eyebrow className="!text-bone/75" prefix={null}>
            {serviceAreas.length > 0
              ? `${radius} mi + ${serviceAreas.length === 1 ? serviceAreas[0] : `${serviceAreas.length} ${t("cities")}`} · live`
              : `${radius} mi ${t("radiusLive")}`}
          </Eyebrow>
          <Link
            href="/pro/availability"
            className="text-[10px] text-bone/75 underline uppercase tracking-wide"
          >
            {t("hours")}
          </Link>
        </div>
        <h1 className="display text-3xl">{t("queueTitle")}</h1>
      </div>

      {profile?.status !== "active" && (
        <div className="px-5 pt-5">
          <Link
            href="/pro/onboard"
            className="block bg-sol text-ink p-4 mb-5 hover:bg-bone"
          >
            <div className="font-bold uppercase text-sm">{t("finishOnboarding")}</div>
            <div className="text-xs mt-1">
              {t("onboardingStatus", { status: profile?.status ?? "pending" })}
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
        serviceAreas={serviceAreas}
        washerCaps={washerCaps}
      />
    </div>
  );
}

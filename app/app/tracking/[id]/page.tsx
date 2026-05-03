import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";
import { TrackingClient } from "@/components/customer/TrackingClient";
import { WasherProfileCard } from "@/components/customer/WasherProfileCard";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { BookingVehicleList } from "@/components/customer/BookingVehicleList";
import { CustomerChecklist } from "@/components/customer/CustomerChecklist";
import { signedUrls } from "@/lib/storage";
import { ApprovalPanel } from "@/components/customer/ApprovalPanel";
import { StatusBanner } from "./StatusBanner";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function TrackingPage({ params }: { params: { id: string } }) {
  const t = await getTranslations("appTracking");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, status, assigned_washer_id, service_id, service_cents, fees_cents, total_cents, tip_cents, discount_cents, points_redeemed, points_earned, is_rush, rush_deadline, rush_made_in_time, rush_bonus_cents, rush_surcharge_cents, customer_tz, customer_note, scheduled_window_start, scheduled_window_end, created_at, started_at, arrived_at, customer_approved_at, funds_released_at, completed_at, work_photo_paths, checklist_progress, addresses(street, city, state, zip, lat, lng, notes, has_water, has_power, water_notes, power_notes, gate_code), services(tier_name, duration_minutes), booking_addons(addon_id, addon_code, addon_name, price_cents, duration_minutes, booking_vehicle_id)"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!booking) notFound();

  // Vehicles + condition photos for this booking. Garage photos
  // (vehicles.photo_paths) and condition photos both render via
  // BookingVehicleList; they live in the same bucket so we batch-sign.
  const { data: bvRows } = await supabase
    .from("booking_vehicles")
    .select(
      "id, vehicle_id, condition_photo_paths, vehicles(year, make, model, color, plate, notes, photo_paths)"
    )
    .eq("booking_id", params.id);
  const photoPaths = (bvRows ?? []).flatMap((r: any) => [
    ...(r.condition_photo_paths ?? []),
    ...(r.vehicles?.photo_paths ?? []),
  ]);

  const workPhotoPaths = (booking as any).work_photo_paths ?? [];

  // Checklist + per-item proof photos so the customer can watch progress
  // live. Pulls BOTH the base service items AND every addon checklist
  // for whatever extras they ticked at booking — flattened into one
  // grouped list so the customer can verify each thing they paid for
  // is actually getting done.
  const trackedAddonRows: Array<{ addon_id: string; addon_name: string }> =
    ((booking as any).booking_addons ?? []).map((a: any) => ({
      addon_id: a.addon_id ?? a.id,
      addon_name: a.addon_name,
    }));
  const trackedAddonIds = trackedAddonRows
    .map((a) => a.addon_id)
    .filter((id): id is string => !!id);
  const trackedAddonNameById = new Map(
    trackedAddonRows.map((a) => [a.addon_id, a.addon_name] as const)
  );

  const [{ data: serviceChecklistItems }, { data: addonChecklistItems }] =
    await Promise.all([
      supabase
        .from("service_checklist_items")
        .select("id, label, hint, requires_photo, sort_order")
        .eq("service_id", (booking as any).service_id)
        .order("sort_order"),
      trackedAddonIds.length > 0
        ? supabase
            .from("addon_checklist_items")
            .select("id, label, hint, requires_photo, sort_order, addon_id")
            .in("addon_id", trackedAddonIds)
            .order("sort_order")
        : Promise.resolve({ data: [] as any[] } as any),
    ]);

  // Build the per-vehicle checklist structure that mirrors what the
  // pro is working through. Each car gets the full base service
  // checklist plus the addon checklists for whatever extras WERE
  // ticked for THAT car. CustomerChecklist renders one collapsible
  // card per vehicle so a 3-car booking doesn't drown the page.
  const baseChecklistItems = ((serviceChecklistItems ?? []) as any[]).map(
    (i) => ({
      id: i.id,
      label: i.label,
      hint: i.hint,
      requires_photo: i.requires_photo,
    })
  );
  const addonItemsByAddonId = new Map<string, typeof baseChecklistItems>();
  for (const i of (addonChecklistItems ?? []) as any[]) {
    const list = addonItemsByAddonId.get(i.addon_id) ?? [];
    list.push({
      id: i.id,
      label: i.label,
      hint: i.hint,
      requires_photo: i.requires_photo,
    });
    addonItemsByAddonId.set(i.addon_id, list);
  }
  const allBookingAddons: Array<{
    addon_id: string;
    addon_name: string;
    booking_vehicle_id: string | null;
  }> = (booking as any).booking_addons ?? [];

  const checklistVehicles = (bvRows ?? []).map((r: any) => {
    const v = r.vehicles ?? {};
    const label = [v.year, v.color, v.make, v.model].filter(Boolean).join(" ") || "Vehicle";
    const addonsOnThisVehicle = allBookingAddons.filter(
      (a) => a.booking_vehicle_id === r.id
    );
    return {
      bookingVehicleId: r.id as string,
      label,
      plate: (v.plate as string | null) ?? null,
      baseItems: baseChecklistItems,
      addons: addonsOnThisVehicle.map((a) => ({
        addonId: a.addon_id,
        addonName: a.addon_name,
        items: addonItemsByAddonId.get(a.addon_id) ?? [],
      })),
    };
  });
  const checklistProgress = ((booking as any).checklist_progress ?? {}) as Record<
    string,
    { done_at?: string; photo_path?: string | null }
  >;
  const checklistPhotoPaths = Object.values(checklistProgress)
    .map((e) => e?.photo_path)
    .filter((p): p is string => !!p);

  // Single batched signing call for vehicle, work, and checklist photos.
  const allSigned = await signedUrls("booking-photos", [
    ...photoPaths,
    ...workPhotoPaths,
    ...checklistPhotoPaths,
  ]);
  const photoUrls = Object.fromEntries(photoPaths.map((p: string) => [p, allSigned[p]]).filter(([, u]) => !!u));
  const workPhotoUrls = Object.fromEntries(
    (workPhotoPaths as string[]).map((p) => [p, allSigned[p]]).filter(([, u]) => !!u)
  );

  const addr = (booking as any).addresses;
  const customerLat = addr?.lat ? Number(addr.lat) : 34.0522;
  const customerLng = addr?.lng ? Number(addr.lng) : -118.2437;

  // Pull the assigned washer's profile + name (best-effort).
  let washerProfile: any = null;
  let washerName: string | null = null;
  if (booking.assigned_washer_id) {
    const [{ data: wp }, { data: wu }] = await Promise.all([
      supabase
        .from("washer_profiles")
        .select(
          "user_id, jobs_completed, rating_avg, bio, has_own_water, has_pressure_washer, background_check_verified"
        )
        .eq("user_id", booking.assigned_washer_id)
        .maybeSingle(),
      supabase
        .from("users")
        .select("full_name, display_name, avatar_url")
        .eq("id", booking.assigned_washer_id)
        .maybeSingle(),
    ]);
    if (wp) {
      // Prefer the public-facing display name if the pro set one. Falls
      // back to full_name. Avatar comes from the public `avatars` bucket
      // and is rendered by WasherProfileCard.
      washerName = (wu as any)?.display_name ?? wu?.full_name ?? null;
      washerProfile = {
        ...wp,
        full_name: wu?.full_name ?? null,
        display_name: (wu as any)?.display_name ?? null,
        avatar_url: (wu as any)?.avatar_url ?? null,
      };
    }
  }

  // Compute extra display values up-front so the JSX stays clean.
  const serviceCents = (booking as any).service_cents ?? 0;
  const trustFee = (booking as any).fees_cents ?? 0;
  const tipCents = (booking as any).tip_cents ?? 0;
  const discountCents = (booking as any).discount_cents ?? 0;
  const rushSurcharge = (booking as any).rush_surcharge_cents ?? 0;
  const isRush = !!(booking as any).is_rush;
  const pointsEarned = (booking as any).points_earned ?? 0;
  const pointsRedeemed = (booking as any).points_redeemed ?? 0;
  const baseTierTotal = serviceCents - (((booking as any).booking_addons ?? []) as any[])
    .reduce((a, x) => a + (x.price_cents ?? 0), 0);
  const addonsTotal = serviceCents - baseTierTotal;

  // Estimated job duration — base tier minutes + sum of every addon's
  // duration. Helps the customer plan around the wash.
  const baseDuration = (booking as any).services?.duration_minutes ?? 0;
  const addonsDuration = (((booking as any).booking_addons ?? []) as any[])
    .reduce((a, x) => a + (x.duration_minutes ?? 0), 0);
  const totalDuration = baseDuration + addonsDuration;
  const durationLabel =
    totalDuration >= 60
      ? `${Math.floor(totalDuration / 60)} hr${totalDuration % 60 ? ` ${totalDuration % 60} min` : ""}`
      : `${totalDuration} min`;

  // Booking-row timestamps — show the timeline below the visual one
  // so the customer can see exact moments things happened.
  const bookedAt = (booking as any).created_at;
  const startedAt = (booking as any).started_at;
  const arrivedAt = (booking as any).arrived_at;
  const completedAt = (booking as any).completed_at;
  const fundedAt = (booking as any).funds_released_at;
  const fmtTime = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
      : null;

  const finalChargeBeforeTip = booking.total_cents;

  return (
    <div className="px-5 pt-10 pb-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/washes" className="text-smoke text-sm">
          ← {t("backToWashes")}
        </Link>
      </div>

      <Eyebrow>{t("eyebrow", { id: booking.id.slice(0, 8) })}</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">
        {(booking as any).services?.tier_name ?? t("defaultServiceName")}
      </h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-6" />

      {/* ── Status hero — visible before any scroll ─────────────── */}
      <StatusBanner
        initialStatus={booking.status}
        arrivedAt={arrivedAt ?? null}
        scheduledStart={(booking as any).scheduled_window_start}
        scheduledEnd={(booking as any).scheduled_window_end}
        isRush={isRush}
        rushDeadline={(booking as any).rush_deadline ?? null}
      />

      {/* ── Quick stats: total + duration + status pill ─────────── */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="bg-mist/40 p-3">
          <div className="font-mono text-[9px] uppercase tracking-wider text-smoke">
            {t("statTotal")}
          </div>
          <div className="display tabular text-xl mt-1 text-ink">
            {fmtUSD(finalChargeBeforeTip)}
          </div>
        </div>
        <div className="bg-mist/40 p-3">
          <div className="font-mono text-[9px] uppercase tracking-wider text-smoke">
            {t("statDuration")}
          </div>
          <div className="display tabular text-xl mt-1 text-ink">{durationLabel}</div>
        </div>
        <div className="bg-mist/40 p-3">
          <div className="font-mono text-[9px] uppercase tracking-wider text-smoke">
            {t("statVehicles")}
          </div>
          <div className="display tabular text-xl mt-1 text-ink">
            {(bvRows ?? []).length}
          </div>
        </div>
      </div>

      <TrackingClient
        bookingId={booking.id}
        initialStatus={booking.status}
        customerLat={customerLat}
        customerLng={customerLng}
        initialWasherId={booking.assigned_washer_id}
      />

      {washerProfile && (
        <div className="mt-6">
          <Eyebrow>{t("yourPro")}</Eyebrow>
          <div className="mt-2">
            <WasherProfileCard profile={washerProfile} publicLink />
          </div>
        </div>
      )}

      {/* ── Service address + site access ───────────────────────── */}
      {addr && (
        <div className="mt-6">
          <Eyebrow>{t("serviceAddress")}</Eyebrow>
          <div className="mt-2 bg-mist/40 p-4 space-y-2">
            <div className="text-sm font-semibold text-ink">
              {addr.street}
            </div>
            <div className="text-xs text-smoke">
              {addr.city}, {addr.state} {addr.zip}
            </div>
            {(addr.has_water !== null ||
              addr.has_power !== null ||
              addr.gate_code) && (
              <div className="grid grid-cols-2 gap-2 pt-2 mt-2 border-t border-bone/40">
                {addr.has_water !== null && (
                  <div className="text-xs">
                    <div className="font-mono text-[9px] uppercase tracking-wider text-smoke">
                      {t("siteWater")}
                    </div>
                    <div className="text-ink/85 mt-0.5">
                      {addr.has_water ? t("siteOnSite") : t("siteBYO")}
                    </div>
                  </div>
                )}
                {addr.has_power !== null && (
                  <div className="text-xs">
                    <div className="font-mono text-[9px] uppercase tracking-wider text-smoke">
                      {t("sitePower")}
                    </div>
                    <div className="text-ink/85 mt-0.5">
                      {addr.has_power ? t("siteOnSite") : t("siteBYO")}
                    </div>
                  </div>
                )}
                {addr.gate_code && (
                  <div className="col-span-2 text-xs bg-sol/15 border-l-2 border-sol px-2 py-1.5">
                    <span className="font-mono uppercase tracking-wider text-[9px] text-smoke">
                      {t("siteGateCode")}
                    </span>
                    <span className="ml-2 font-mono font-bold tabular text-ink">
                      {addr.gate_code}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Customer note (if any) ──────────────────────────────── */}
      {(booking as any).customer_note && (
        <div className="mt-6">
          <Eyebrow>{t("yourNote")}</Eyebrow>
          <div className="mt-2 bg-sol/10 border-l-2 border-sol p-3 text-sm text-ink/85 leading-relaxed">
            {(booking as any).customer_note}
          </div>
        </div>
      )}

      {(bvRows ?? []).length > 0 && (
        <div className="mt-6">
          <BookingVehicleList rows={(bvRows ?? []) as any} signedPhotoUrls={photoUrls} />
        </div>
      )}

      {checklistVehicles.length > 0 && (
        <CustomerChecklist
          vehicles={checklistVehicles as any}
          progress={checklistProgress}
          signedPhotoUrls={allSigned}
          title={t("checklistTitle")}
        />
      )}

      {user && booking.assigned_washer_id && (
        <ChatPanel
          bookingId={booking.id}
          currentUserId={user.id}
          otherName={washerName ?? t("yourProFallback")}
          variant="customer"
        />
      )}

      {/* ── Itemized receipt — full breakdown ───────────────────── */}
      {(() => {
        const allAddons: Array<{
          addon_code: string;
          addon_name: string;
          price_cents: number;
          booking_vehicle_id: string | null;
        }> = (booking as any).booking_addons ?? [];
        const addonsByBV = new Map<string, typeof allAddons>();
        const orphanAddons: typeof allAddons = [];
        for (const a of allAddons) {
          if (a.booking_vehicle_id) {
            const list = addonsByBV.get(a.booking_vehicle_id) ?? [];
            list.push(a);
            addonsByBV.set(a.booking_vehicle_id, list);
          } else {
            orphanAddons.push(a);
          }
        }
        const perVehicleBase = (bvRows ?? []).length > 0
          ? Math.round(baseTierTotal / (bvRows ?? []).length)
          : baseTierTotal;
        return (
          <div className="mt-6 bg-mist/40 p-4 text-sm">
            <div className="font-mono text-[10px] uppercase tracking-wider text-smoke mb-3">
              {t("receiptTitle")}
            </div>

            <div className="font-bold mb-3">
              {(booking as any).services?.tier_name ?? t("defaultServiceName")}
            </div>

            <div className="space-y-3">
              {(bvRows ?? []).map((r: any) => {
                const v = r.vehicles ?? {};
                const label = [v.year, v.color, v.make, v.model]
                  .filter(Boolean)
                  .join(" ");
                const vehicleAddons = addonsByBV.get(r.id) ?? [];
                const vehicleSubtotal =
                  perVehicleBase + vehicleAddons.reduce((a, x) => a + x.price_cents, 0);
                return (
                  <div key={r.id} className="bg-bone/40 p-2.5">
                    <div className="flex justify-between items-baseline">
                      <div className="text-xs font-semibold text-ink">
                        → {label || t("defaultServiceName")}
                        {v.plate ? (
                          <span className="ml-1 font-mono text-[10px] text-smoke">· {v.plate}</span>
                        ) : null}
                      </div>
                      <span className="tabular text-xs text-smoke">{fmtUSD(perVehicleBase)}</span>
                    </div>
                    {vehicleAddons.length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        {vehicleAddons.map((a) => (
                          <div
                            key={a.addon_code}
                            className="flex justify-between text-xs pl-3"
                          >
                            <span className="text-ink/80">+ {a.addon_name}</span>
                            <span className="tabular text-smoke">{fmtUSD(a.price_cents)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-xs pt-1 mt-1 border-t border-bone/40 pl-3">
                          <span className="text-smoke font-semibold">{t("paySubtotal")}</span>
                          <span className="tabular font-semibold">{fmtUSD(vehicleSubtotal)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {orphanAddons.length > 0 && (
              <div className="mt-3 space-y-1">
                <div className="font-mono text-[10px] uppercase tracking-wider text-smoke mb-1">
                  {t("addonsIncluded")}
                </div>
                {orphanAddons.map((a) => (
                  <div key={a.addon_code} className="flex justify-between text-xs">
                    <span>+ {a.addon_name}</span>
                    <span className="tabular text-smoke">{fmtUSD(a.price_cents)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Full charge breakdown — service total, trust fee, rush,
                tip, discount, points, then the grand total. */}
            <div className="border-t border-bone/30 mt-4 pt-3 space-y-1.5">
              {addonsTotal > 0 && (
                <div className="flex justify-between text-xs text-smoke">
                  <span>{t("payAddonsSubtotal")}</span>
                  <span className="tabular">+{fmtUSD(addonsTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-smoke">
                <span>{t("trustFee")}</span>
                <span className="tabular">{fmtUSD(trustFee)}</span>
              </div>
              {rushSurcharge > 0 && (
                <div className="flex justify-between text-xs text-royal font-semibold">
                  <span>{t("rushSurcharge")}</span>
                  <span className="tabular">+{fmtUSD(rushSurcharge)}</span>
                </div>
              )}
              {discountCents > 0 && (
                <div className="flex justify-between text-xs text-good">
                  <span>{t("discount")}</span>
                  <span className="tabular">−{fmtUSD(discountCents)}</span>
                </div>
              )}
              {pointsRedeemed > 0 && (
                <div className="flex justify-between text-xs text-good">
                  <span>{t("pointsRedeemed", { points: pointsRedeemed.toLocaleString() })}</span>
                  <span className="tabular">−{fmtUSD(pointsRedeemed)}</span>
                </div>
              )}
              {tipCents > 0 && (
                <div className="flex justify-between text-xs text-smoke">
                  <span>{t("tipLabel")}</span>
                  <span className="tabular">+{fmtUSD(tipCents)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between border-t border-bone/30 mt-3 pt-3">
              <span className="font-bold">{t("total")}</span>
              <span className="display tabular text-xl">{fmtUSD(finalChargeBeforeTip + tipCents)}</span>
            </div>

            {pointsEarned > 0 && (
              <div className="mt-3 text-xs text-good text-center bg-good/10 p-2">
                {t("pointsEarnedNote", { points: pointsEarned.toLocaleString() })}
              </div>
            )}
          </div>
        );
      })()}

      {booking.status === "completed" && (
        <div className="mt-6">
          <ApprovalPanel
            bookingId={booking.id}
            approvedAt={(booking as any).customer_approved_at}
            fundsReleasedAt={(booking as any).funds_released_at}
            completedAt={(booking as any).completed_at}
            workPhotoUrls={workPhotoUrls}
          />
        </div>
      )}

      {/* ── Booking timeline + metadata footer ──────────────────── */}
      <div className="mt-8 bg-white/40 p-4 text-xs text-smoke">
        <div className="font-mono text-[10px] uppercase tracking-wider text-smoke mb-3">
          {t("bookingDetails")}
        </div>
        <div className="space-y-1.5">
          {bookedAt && (
            <div className="flex justify-between">
              <span>{t("timelineBooked")}</span>
              <span className="tabular">{fmtTime(bookedAt)}</span>
            </div>
          )}
          {arrivedAt && (
            <div className="flex justify-between">
              <span>{t("timelineArrived")}</span>
              <span className="tabular">{fmtTime(arrivedAt)}</span>
            </div>
          )}
          {startedAt && (
            <div className="flex justify-between">
              <span>{t("timelineStarted")}</span>
              <span className="tabular">{fmtTime(startedAt)}</span>
            </div>
          )}
          {completedAt && (
            <div className="flex justify-between">
              <span>{t("timelineCompleted")}</span>
              <span className="tabular">{fmtTime(completedAt)}</span>
            </div>
          )}
          {fundedAt && (
            <div className="flex justify-between">
              <span>{t("timelineFunded")}</span>
              <span className="tabular">{fmtTime(fundedAt)}</span>
            </div>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-bone/30 flex justify-between items-center">
          <span className="font-mono text-[10px] uppercase tracking-wider opacity-60">
            {t("bookingId")}
          </span>
          <span className="font-mono text-[10px] tabular text-ink/60">{booking.id}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 justify-end">
          <Link
            href={`/app/washes`}
            className="text-[10px] font-mono uppercase tracking-wider text-smoke hover:text-ink transition"
          >
            {t("backToWashes")} →
          </Link>
          <Link
            href={`/app/help?topic=booking&id=${booking.id}`}
            className="text-[10px] font-mono uppercase tracking-wider text-smoke hover:text-ink transition"
          >
            {t("getHelp")} →
          </Link>
        </div>
        {(booking as any).customer_tz && (
          <div className="mt-3 text-[10px] text-smoke/70 text-center font-mono">
            {t("tzNote", { tz: (booking as any).customer_tz })}
          </div>
        )}
      </div>

    </div>
  );
}

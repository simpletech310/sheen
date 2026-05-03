"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { computeFees } from "@/lib/stripe/fees";
import { fmtUSD } from "@/lib/pricing";
import { StripePaymentElement } from "@/components/customer/StripePaymentElement";
import { readDraft, clearDraft } from "@/lib/booking-draft";
import { snapshotAddons, sumAddonPrices, getAddonByCode } from "@/lib/addons";
import { useTranslations } from "next-intl";

function PayInner() {
  const router = useRouter();
  const params = useSearchParams();
  const t = useTranslations("appBook");
  const tier = params.get("tier") ?? "Premium Detail";
  const basePrice = Number(params.get("price") ?? "18500");
  const count = Math.max(1, Number(params.get("count") ?? "1"));
  const rawCategory = params.get("category");
  const category =
    rawCategory === "home" ? "home" : rawCategory === "big_rig" ? "big_rig" : "auto";
  // Auto + Big Rig multiply by vehicle count. Home has its multiplier baked
  // into `price` already (e.g. solar panels × N).
  const baseTierTotal = category === "home" ? basePrice : basePrice * count;
  const usesVehicles = category === "auto" || category === "big_rig";

  // Add-ons (auto + big-rig only) — keyed by vehicle so each car can
  // get its own list. Carries from the addons step via sessionStorage.
  const draftForAddons = typeof window !== "undefined" ? readDraft() : null;
  const addonsByVehicle = draftForAddons?.addonsByVehicleId ?? {};
  const perVehicleSnapshots = useMemo(() => {
    return Object.entries(addonsByVehicle).map(([vehicleId, pv]) => ({
      vehicleId,
      addons: snapshotAddons(pv.codes, pv.size),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const addonsCents = perVehicleSnapshots.reduce(
    (a, p) => a + sumAddonPrices(p.addons),
    0
  );

  const totalServiceCents = baseTierTotal + addonsCents;
  const fees = computeFees({ serviceCents: totalServiceCents, routedTo: "solo_washer" });

  // Vehicle metadata for the receipt — fetched once on mount.
  const [vehicleLabels, setVehicleLabels] = useState<Record<string, string>>({});
  useEffect(() => {
    fetch("/api/vehicles")
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, string> = {};
        for (const v of d.vehicles ?? []) {
          const parts = [v.year, v.color, v.make, v.model].filter(Boolean);
          map[v.id] = parts.join(" ") || "Vehicle";
        }
        setVehicleLabels(map);
      })
      .catch(() => {});
  }, []);

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [redeemPoints, setRedeemPoints] = useState(Number(params.get("redeem") ?? "0"));
  // Achievement freebie matching this booking's category + tier, if any.
  const [matchingCredit, setMatchingCredit] = useState<{ id: string; source: string } | null>(null);
  const [useCredit, setUseCredit] = useState(params.get("credit") === "1");

  const street = params.get("street") ?? "";
  const unit = params.get("unit") ?? "";
  const city = params.get("city") ?? "";
  const state = params.get("state") ?? "CA";
  const zip = params.get("zip") ?? "";
  const lat = params.get("lat");
  const lng = params.get("lng");
  const notes = params.get("notes") ?? "";
  const win = params.get("window") ?? "tomorrow_10_12";
  const isRush = params.get("rush") === "1";
  const requestedHandle = params.get("handle") ?? "";
  // Mirror the server-side calc — surfaces the surcharge inline on the
  // pay summary so the customer sees exactly what they're paying.
  const rushSurchargeCents = isRush ? Math.round(totalServiceCents * 0.15) : 0;

  useEffect(() => {
    if (!street || !zip) {
      setErr(t("errMissingAddress"));
      setLoading(false);
      return;
    }
    // Auto + Big Rig bookings carry vehicles in the draft; home bookings don't.
    const draft = readDraft();
    if (usesVehicles && (!draft || draft.vehicleIds.length === 0)) {
      setErr(t("errNoVehicles"));
      setLoading(false);
      return;
    }
    // Best-effort load of loyalty balance for the redemption slider.
    fetch("/api/loyalty/balance")
      .then((r) => r.json())
      .then((d) => setPointsBalance(d.points ?? 0))
      .catch(() => {});

    // Find an achievement freebie that fits this exact tier + category.
    // Pay page is the only place we surface them.
    fetch("/api/loyalty/credits")
      .then((r) => r.json())
      .then((d) => {
        const match = (d.credits ?? []).find(
          (c: any) => c.service_category === category && c.service_tier_name === tier
        );
        if (match) setMatchingCredit({ id: match.id, source: match.source_achievement_id });
      })
      .catch(() => {});

    (async () => {
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tier_name: tier,
            category,
            // Send the BASE tier × vehicle_count only. The server snapshots
            // add-ons from addon_codes + vehicle_size and sums them onto
            // the total — sending a pre-summed value would double-count.
            service_cents: baseTierTotal,
            vehicle_ids: usesVehicles ? draft?.vehicleIds : undefined,
            condition_photos: usesVehicles ? draft?.conditionPhotos : undefined,
            requested_wash_handle: requestedHandle || undefined,
            redeem_points: redeemPoints || undefined,
            redeem_credit_id: useCredit && matchingCredit ? matchingCredit.id : undefined,
            // Per-vehicle add-on map. Server snapshots prices itself
            // (it's the only place we trust the math) using the size
            // each vehicle was tagged with in the addons step.
            addons_by_vehicle:
              Object.keys(addonsByVehicle).length > 0
                ? Object.fromEntries(
                    Object.entries(addonsByVehicle).map(([vid, pv]) => [
                      vid,
                      { codes: pv.codes, size: pv.size },
                    ])
                  )
                : undefined,
            address: {
              street,
              unit,
              city,
              state,
              zip,
              lat: lat ? Number(lat) : undefined,
              lng: lng ? Number(lng) : undefined,
              notes,
              has_water: draft?.siteHasWater ?? null,
              has_power: draft?.siteHasPower ?? null,
              water_notes: draft?.waterNotes || undefined,
              power_notes: draft?.powerNotes || undefined,
              gate_code: draft?.gateCode || undefined,
              site_photo_paths: draft?.sitePhotoPaths ?? [],
            },
            window: isRush ? undefined : win,
            is_rush: isRush,
          }),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error || `Status ${res.status}`);
        }
        const data = await res.json();
        if (data.covered_by_membership || data.covered_by_loyalty || data.covered_by_credit) {
          clearDraft();
          router.replace(`/app/tracking/${data.booking_id}`);
          return;
        }
        setClientSecret(data.client_secret);
        setBookingId(data.booking_id);
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPaymentSuccess() {
    clearDraft();
    router.push(`/app/tracking/${bookingId}`);
  }

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/book/address" className="text-smoke text-sm">
          {t("back")}
        </Link>
      </div>
      <Eyebrow>
        {category === "home" ? t("payStepHome") : t("payStepAuto")}
      </Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">{t("payHeadline")}</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-5" />

      <div className="bg-mist/40 p-5 mb-5">
        <div className="text-sm font-bold">{tier}</div>
        <div className="text-xs text-smoke">
          {street}
          {unit ? ` ${unit}` : ""}, {city}, {state} {zip}
        </div>
        <div className="text-xs text-smoke mt-1">{win.replace(/_/g, " ")}</div>
        {usesVehicles && (
          <div className="text-xs text-smoke mt-1">
            {count} {category === "big_rig" ? t(count === 1 ? "rigSingular" : "rigPlural") : t(count === 1 ? "vehicleSingular" : "vehiclePlural")}
          </div>
        )}
        {requestedHandle && (
          <div className="text-xs mt-2 font-mono uppercase tracking-wider text-royal">
            {t("requestingPro")} · {requestedHandle}
          </div>
        )}
      </div>

      {/* Achievement freebie matches this exact tier — offer to redeem it
          here. One click, the booking comes back covered ($0 due). */}
      {matchingCredit && !clientSecret && !loading && (
        <div className="bg-good text-ink p-4 mb-5 border-l-2 border-ink">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider opacity-80">
                {t("achievementFreebie")}
              </div>
              <div className="text-sm mt-1">
                {t("freebieDescription", {
                  tier,
                  source: matchingCredit.source.replace(/_/g, " "),
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set("credit", useCredit ? "0" : "1");
                window.location.href = url.pathname + url.search;
              }}
              className="bg-ink text-bone px-3 py-2 text-xs font-bold uppercase tracking-wide hover:bg-royal"
            >
              {useCredit ? t("dontUseCredit") : t("applyAndRefresh")}
            </button>
          </div>
        </div>
      )}

      {pointsBalance > 0 && !clientSecret && !loading && (
        <div className="bg-royal text-bone p-4 mb-5">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider opacity-80">
                {t("redeemLoyalty")}
              </div>
              <div className="text-sm mt-1">
                {t("pointsAvailable", { count: pointsBalance.toLocaleString() })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const max = Math.min(pointsBalance, fees.serviceCents);
                setRedeemPoints(redeemPoints > 0 ? 0 : Math.floor(max / 100) * 100);
              }}
              className="bg-sol text-ink px-3 py-2 text-xs font-bold uppercase tracking-wide hover:bg-bone"
            >
              {redeemPoints > 0 ? t("clearPoints") : t("applyMaxPoints")}
            </button>
          </div>
          {redeemPoints > 0 && (
            <>
              <div className="mt-3">
                <input
                  type="range"
                  min={0}
                  max={Math.min(pointsBalance, fees.serviceCents)}
                  step={100}
                  value={redeemPoints}
                  onChange={(e) => setRedeemPoints(Number(e.target.value))}
                  className="w-full accent-sol"
                />
                <div className="flex justify-between text-xs mt-1 opacity-90 tabular">
                  <span>{redeemPoints.toLocaleString()} pts</span>
                  <span>− {fmtUSD(redeemPoints)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set("redeem", String(redeemPoints));
                  window.location.href = url.pathname + url.search;
                }}
                className="mt-3 w-full bg-ink text-bone py-2.5 text-xs font-bold uppercase tracking-wide hover:bg-bone hover:text-ink"
              >
                {t("applyAndRefreshCheckout")}
              </button>
            </>
          )}
        </div>
      )}

      <div className="space-y-2.5 text-sm mb-5">
        <div className="flex justify-between">
          <span className="text-smoke">
            {tier} {count > 1 ? `× ${count}` : ""}
          </span>
          <span className="tabular">{fmtUSD(baseTierTotal)}</span>
        </div>
        {count > 1 && (
          <div className="flex justify-between text-xs text-smoke pl-2">
            <span>{t("perVehicle", { price: fmtUSD(basePrice) })}</span>
            <span />
          </div>
        )}
        {/* Per-vehicle add-on lines — grouped under the car they
            belong to so the customer sees exactly what was ordered
            for which vehicle. */}
        {perVehicleSnapshots.map(({ vehicleId, addons }) => {
          if (addons.length === 0) return null;
          return (
            <div key={vehicleId} className="pt-1.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-smoke pl-2">
                {vehicleLabels[vehicleId] ?? t("payVehicleAddonsLabel", { id: vehicleId.slice(0, 6) })}
              </div>
              {addons.map((sa) => {
                const a = getAddonByCode(sa.code);
                return (
                  <div
                    key={`${vehicleId}-${sa.code}`}
                    className="flex justify-between text-xs text-smoke pl-4"
                  >
                    <span>+ {a?.name ?? sa.code}</span>
                    <span className="tabular">{fmtUSD(sa.price_cents)}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
        <div className="flex justify-between">
          <span className="text-smoke">{t("trustFee")}</span>
          <span className="tabular">{fmtUSD(fees.trustFee)}</span>
        </div>
        {isRush && (
          <div className="flex justify-between">
            <span className="text-royal font-bold">{t("rushSurchargeLabel")}</span>
            <span className="tabular text-royal">+{fmtUSD(rushSurchargeCents)}</span>
          </div>
        )}
        <div className="flex justify-between text-xs text-smoke">
          <span>{t("tipNote")}</span>
          <span>—</span>
        </div>
        <div className="flex justify-between pt-3 border-t border-mist">
          <span className="font-bold">{t("totalToday")}</span>
          <span className="display tabular text-2xl">
            {fmtUSD(fees.customerCharge + rushSurchargeCents)}
          </span>
        </div>
        {isRush && (
          <p className="text-[11px] text-smoke leading-relaxed pt-1">
            {t("rushRefundNote")}
          </p>
        )}
      </div>

      {loading && (
        <div className="bg-mist/40 p-6 text-center text-sm text-smoke">{t("settingUpPayment")}</div>
      )}
      {err && <div className="text-sm text-bad mb-4">{err}</div>}

      {clientSecret && bookingId && (
        <StripePaymentElement
          clientSecret={clientSecret}
          amountLabel={fmtUSD(fees.customerCharge + rushSurchargeCents)}
          onSuccess={onPaymentSuccess}
        />
      )}

      <p className="text-[11px] text-smoke text-center mt-4">{t("payFooter")}</p>
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense>
      <PayInner />
    </Suspense>
  );
}

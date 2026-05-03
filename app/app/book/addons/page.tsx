"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";
import {
  getCompatibleAddons,
  snapshotAddons,
  sumAddonPrices,
  SIZE_MULTIPLIER,
  type AddonCategory,
  type VehicleSize,
  type Addon,
} from "@/lib/addons";
import { readDraft, writeDraft } from "@/lib/booking-draft";

// Per-vehicle add-on picker. One section per car the customer picked
// in the previous step — Honda gets a wax, Dodge stays bare. Each
// section also carries its own size multiplier (sedan/SUV/truck) so
// premium add-ons (ceramic, shampoo, paint correction) price right
// for that specific vehicle.
//
// Big-rig category: section per rig, no size multiplier (pricing flat).

type VehicleLite = {
  id: string;
  year: number | null;
  make: string | null;
  model: string | null;
  color: string | null;
  plate: string | null;
};

type PerVehicle = {
  codes: Set<string>;
  size: VehicleSize;
};

function vehicleLabel(v: VehicleLite): string {
  const parts = [v.year, v.color, v.make, v.model].filter(Boolean);
  return parts.join(" ") || "Vehicle";
}

function AddonsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const t = useTranslations("appBook");

  const tier = params.get("tier") ?? "Premium Detail";
  const basePrice = Number(params.get("price") ?? "0");
  const category: AddonCategory = params.get("category") === "big_rig" ? "big_rig" : "auto";
  const handle = params.get("handle") ?? "";

  const compatible = useMemo(() => getCompatibleAddons(category, tier), [category, tier]);

  // Vehicles + state hydrated from draft and /api/vehicles. Empty
  // state means the user landed here without picking vehicles — push
  // them back to the picker.
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);
  const [perVehicle, setPerVehicle] = useState<Record<string, PerVehicle>>({});
  const [hydrated, setHydrated] = useState(false);
  // Collapsed cards by default — only one expanded at a time so the
  // list stays scannable even with 5+ vehicles. Customer taps a car
  // to expand, picks add-ons, taps again to collapse.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const draft = readDraft();
    if (!draft || draft.vehicleIds.length === 0) {
      router.replace(`/app/book/${category === "big_rig" ? "big-rig" : "auto"}?tier=${encodeURIComponent(tier)}`);
      return;
    }
    // Hydrate per-vehicle state from any prior addon picks.
    const map: Record<string, PerVehicle> = {};
    for (const id of draft.vehicleIds) {
      const prior = draft.addonsByVehicleId?.[id];
      map[id] = {
        codes: new Set(prior?.codes ?? []),
        size: prior?.size ?? "sedan",
      };
    }
    setPerVehicle(map);

    // Resolve vehicle metadata so each section can show "2006 Silver Honda Accord".
    fetch("/api/vehicles")
      .then((r) => r.json())
      .then((d) => {
        const all: VehicleLite[] = d.vehicles ?? d ?? [];
        const owned = new Set(draft.vehicleIds);
        // Keep selection order from the draft so the cards match the
        // previous step exactly.
        const ordered = draft.vehicleIds
          .map((id) => all.find((v) => v.id === id))
          .filter((v): v is VehicleLite => !!v);
        if (ordered.length > 0) setVehicles(ordered);
        else setVehicles(all.filter((v) => owned.has(v.id)));
        setHydrated(true);
      })
      .catch(() => setHydrated(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleCode(vehicleId: string, code: string) {
    setPerVehicle((prev) => {
      const cur = prev[vehicleId] ?? { codes: new Set<string>(), size: "sedan" };
      const nextCodes = new Set(cur.codes);
      if (nextCodes.has(code)) nextCodes.delete(code);
      else nextCodes.add(code);
      return { ...prev, [vehicleId]: { ...cur, codes: nextCodes } };
    });
  }

  function setSize(vehicleId: string, size: VehicleSize) {
    setPerVehicle((prev) => {
      const cur = prev[vehicleId] ?? { codes: new Set<string>(), size: "sedan" };
      return { ...prev, [vehicleId]: { ...cur, size } };
    });
  }

  // Live totals — base × vehicle_count + sum of per-vehicle addon prices.
  const baseTotal = basePrice * vehicles.length;
  const perVehiclePriced = useMemo(() => {
    return vehicles.map((v) => {
      const pv = perVehicle[v.id];
      const snaps = pv ? snapshotAddons(Array.from(pv.codes), pv.size) : [];
      return { vehicle: v, addons: snaps, addonsTotal: sumAddonPrices(snaps) };
    });
  }, [vehicles, perVehicle]);
  const addonsGrandTotal = perVehiclePriced.reduce((a, p) => a + p.addonsTotal, 0);
  const grandTotal = baseTotal + addonsGrandTotal;

  function continueNext() {
    const draft = readDraft();
    if (!draft) return;
    // Convert Set → array for sessionStorage.
    const out: Record<string, { codes: string[]; size: VehicleSize }> = {};
    for (const [vid, pv] of Object.entries(perVehicle)) {
      out[vid] = { codes: Array.from(pv.codes), size: pv.size };
    }
    writeDraft({
      ...draft,
      tier,
      price: basePrice,
      addonsByVehicleId: out,
    });
    const url = new URL("/app/book/address", window.location.origin);
    url.searchParams.set("tier", tier);
    url.searchParams.set("price", String(basePrice));
    url.searchParams.set("count", String(vehicles.length));
    if (category === "big_rig") url.searchParams.set("category", "big_rig");
    if (handle) url.searchParams.set("handle", handle);
    router.push(url.pathname + url.search);
  }

  const backHref = `/app/book/vehicles?tier=${encodeURIComponent(tier)}&price=${basePrice}${category === "big_rig" ? "&category=big_rig" : ""}`;
  const totalAddonsPicked = perVehiclePriced.reduce((a, p) => a + p.addons.length, 0);

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href={backHref} className="text-smoke text-sm">
          {t("back")}
        </Link>
      </div>
      <Eyebrow>{t("addonsStep")}</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">{t("addonsHeadline")}</h1>
      <p className="text-xs text-smoke mb-5 leading-relaxed">{t("addonsSubheadPerVehicle")}</p>

      {!hydrated && (
        <div className="bg-mist/40 p-6 text-center text-sm text-smoke">
          {t("loading") ?? "Loading…"}
        </div>
      )}

      {/* Collapsible per-vehicle cards. Tap to expand and pick add-ons,
          tap again to collapse. Keeps the page scannable on big bookings
          (5 vehicles × 13 add-ons would otherwise be 65 stacked rows). */}
      {hydrated && perVehiclePriced.map(({ vehicle, addons, addonsTotal }, vIdx) => {
        const pv = perVehicle[vehicle.id] ?? { codes: new Set<string>(), size: "sedan" as VehicleSize };
        const isOpen = expandedId === vehicle.id;
        const pickedCount = addons.length;
        return (
          <div key={vehicle.id} className="mb-3 bg-bone border border-mist">
            {/* Header — always visible. Acts as the toggle. */}
            <button
              type="button"
              onClick={() => setExpandedId(isOpen ? null : vehicle.id)}
              aria-expanded={isOpen}
              className="w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-mist/40 transition"
            >
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-wider text-royal">
                  {t("addonsVehicleN", { n: vIdx + 1, total: vehicles.length })}
                </div>
                <div className="text-sm font-bold mt-0.5 truncate">
                  {vehicleLabel(vehicle)}
                  {vehicle.plate ? (
                    <span className="ml-1 font-mono text-[10px] text-smoke">· {vehicle.plate}</span>
                  ) : null}
                </div>
                <div className="text-[11px] text-smoke mt-1">
                  {pickedCount === 0
                    ? t("addonsBaseOnly")
                    : t("addonsCount", { count: pickedCount })}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div
                  key={`${vehicle.id}-${addonsTotal}`}
                  className="display tabular text-lg text-ink"
                  style={{ animation: "fadeSlideIn 180ms ease-out" }}
                >
                  {fmtUSD(basePrice + addonsTotal)}
                </div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-smoke">
                  {tier}
                </div>
              </div>
              <span
                className={`shrink-0 ml-2 text-smoke transition-transform ${isOpen ? "rotate-180" : ""}`}
                aria-hidden
              >
                ⌄
              </span>
            </button>

            {isOpen && (
              <div className="border-t border-mist">
                {category === "auto" && (
                  <div className="px-4 py-3 border-b border-mist">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-smoke mb-2">
                      {t("addonsThisVehicleSize")}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(["sedan", "suv", "truck"] as VehicleSize[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => setSize(vehicle.id, s)}
                          className={`py-2 text-xs font-bold uppercase tracking-wide transition ${
                            pv.size === s ? "bg-ink text-bone" : "bg-mist text-ink hover:bg-bone"
                          }`}
                        >
                          {t(`addonsSize_${s}` as any)}
                          <span className="block tabular text-[10px] mt-0.5 opacity-75">
                            {SIZE_MULTIPLIER[s].toFixed(2)}×
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3 space-y-2">
                  {compatible.length === 0 && (
                    <div className="text-xs text-smoke text-center py-4">
                      {t("addonsNoneAvailable")}
                    </div>
                  )}
                  {compatible.map((a: Addon) => {
                    const on = pv.codes.has(a.code);
                    const mult = a.size_multiplier_applies && category === "auto" ? SIZE_MULTIPLIER[pv.size] : 1;
                    const adjustedPrice = Math.round(a.base_price_cents * mult);
                    return (
                      <button
                        key={a.code}
                        onClick={() => toggleCode(vehicle.id, a.code)}
                        className={`w-full text-left p-3 transition ${
                          on ? "bg-ink text-bone" : "bg-mist/40 hover:bg-mist text-ink"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold">{a.name}</div>
                            <div className={`text-[11px] mt-0.5 leading-snug ${on ? "text-bone/70" : "text-smoke"}`}>
                              {a.short_desc}
                            </div>
                            <div
                              className={`font-mono text-[10px] uppercase tracking-wider mt-1 ${
                                on ? "text-sol/80" : "text-smoke"
                              }`}
                            >
                              {Math.round(a.duration_minutes * mult)} min
                              {a.size_multiplier_applies && mult !== 1 && (
                                <> · {mult.toFixed(2)}× size</>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="display tabular text-base">+{fmtUSD(adjustedPrice)}</div>
                            <div
                              className={`font-mono text-[9px] uppercase tracking-wider mt-1 px-1.5 py-0.5 inline-block ${
                                on ? "bg-sol text-ink" : "bg-bone text-smoke"
                              }`}
                            >
                              {on ? t("addonsAdded") : t("addonsAdd")}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Sticky grand total */}
      {hydrated && (
        <div className="sticky bottom-0 left-0 right-0 -mx-5 mt-6 border-t border-mist bg-bone/95 backdrop-blur supports-[backdrop-filter]:bg-bone/85 px-5 py-4">
          <div className="flex justify-between items-center mb-3 text-sm">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-smoke">
                {t("addonsGrandTotalLabel")}
              </div>
              <div className="text-xs text-smoke">
                {tier} × {vehicles.length}
                {totalAddonsPicked > 0 && <> + {t("addonsCount", { count: totalAddonsPicked })}</>}
              </div>
            </div>
            <div
              key={grandTotal}
              className="display tabular text-2xl text-ink"
              style={{ animation: "fadeSlideIn 180ms ease-out" }}
            >
              {fmtUSD(grandTotal)}
            </div>
          </div>
          <button
            onClick={continueNext}
            className="w-full bg-cobalt text-bone py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-ink transition"
          >
            {totalAddonsPicked === 0 ? t("addonsSkip") : t("addonsContinue")}
          </button>
        </div>
      )}
    </div>
  );
}

export default function AddonsPage() {
  return (
    <Suspense>
      <AddonsInner />
    </Suspense>
  );
}

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
} from "@/lib/addons";
import { readDraft, writeDraft } from "@/lib/booking-draft";

// Composable add-on picker that runs after tier selection. Customer
// stacks any extras they want (interior shampoo, ceramic, etc.) on
// top of the base tier; the running total updates live.
//
// Vehicle size only shown for auto bookings — big-rig pricing is
// flat (rigs don't scale linearly with size the way a sedan vs
// truck does). Size only matters for size_multiplier_applies addons.
function AddonsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const t = useTranslations("appBook");

  const tier = params.get("tier") ?? "Premium Detail";
  const basePrice = Number(params.get("price") ?? "0");
  const category: AddonCategory = params.get("category") === "big_rig" ? "big_rig" : "auto";
  const handle = params.get("handle") ?? "";

  const compatible = useMemo(() => getCompatibleAddons(category, tier), [category, tier]);

  const [size, setSize] = useState<VehicleSize>(
    (params.get("size") as VehicleSize) || "sedan"
  );
  const [picked, setPicked] = useState<Set<string>>(new Set());

  // Hydrate from sessionStorage if user backed into the step.
  useEffect(() => {
    const d = readDraft();
    if (d?.addonCodes) setPicked(new Set(d.addonCodes));
    if (d?.vehicleSize) setSize(d.vehicleSize);
  }, []);

  const selected = useMemo(
    () => snapshotAddons(Array.from(picked), size),
    [picked, size]
  );
  const addonsTotal = sumAddonPrices(selected);
  const total = basePrice + addonsTotal;

  function toggle(code: string) {
    const next = new Set(picked);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setPicked(next);
  }

  function continueNext() {
    const d = readDraft() ?? {
      tier,
      price: basePrice,
      vehicleIds: [],
      conditionPhotos: {},
    };
    writeDraft({
      ...d,
      tier,
      price: basePrice,
      addonCodes: Array.from(picked),
      vehicleSize: size,
    });
    const url = new URL("/app/book/vehicles", window.location.origin);
    url.searchParams.set("tier", tier);
    // Pass through the *base* price — the pay page recomputes addons
    // from the draft so the URL doesn't bloat with codes.
    url.searchParams.set("price", String(basePrice));
    if (category === "big_rig") url.searchParams.set("category", "big_rig");
    if (handle) url.searchParams.set("handle", handle);
    router.push(url.pathname + url.search);
  }

  const backHref =
    category === "big_rig"
      ? `/app/book/big-rig?tier=${encodeURIComponent(tier)}`
      : `/app/book/auto?tier=${encodeURIComponent(tier)}`;

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href={backHref} className="text-smoke text-sm">
          {t("back")}
        </Link>
      </div>
      <Eyebrow>{t("addonsStep")}</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">{t("addonsHeadline")}</h1>
      <p className="text-xs text-smoke mb-5 leading-relaxed">{t("addonsSubhead")}</p>

      {/* Vehicle-size picker — auto only, drives the multiplier on
          premium add-ons (ceramic, shampoo, etc.). Quick add-ons stay
          flat regardless. */}
      {category === "auto" && (
        <div className="bg-mist/40 p-4 mb-5">
          <div className="font-mono text-[10px] uppercase tracking-wider text-smoke mb-2">
            {t("addonsVehicleSize")}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["sedan", "suv", "truck"] as VehicleSize[]).map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`py-2.5 text-xs font-bold uppercase tracking-wide transition ${
                  size === s
                    ? "bg-ink text-bone"
                    : "bg-bone text-ink hover:bg-mist"
                }`}
              >
                {t(`addonsSize_${s}` as any)}
                <span className="block tabular text-[10px] mt-0.5 opacity-75">
                  {SIZE_MULTIPLIER[s].toFixed(2)}×
                </span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-smoke mt-2 leading-relaxed">
            {t("addonsSizeNote")}
          </p>
        </div>
      )}

      <div className="space-y-2 mb-5">
        {compatible.length === 0 && (
          <div className="bg-mist/40 p-4 text-xs text-smoke text-center">
            {t("addonsNoneAvailable")}
          </div>
        )}
        {compatible.map((a) => {
          const on = picked.has(a.code);
          const mult = a.size_multiplier_applies && category === "auto" ? SIZE_MULTIPLIER[size] : 1;
          const adjustedPrice = Math.round(a.base_price_cents * mult);
          return (
            <button
              key={a.code}
              onClick={() => toggle(a.code)}
              className={`w-full text-left p-4 transition ${
                on ? "bg-ink text-bone" : "bg-mist/50 hover:bg-mist text-ink"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold">{a.name}</div>
                  <div className={`text-xs mt-0.5 leading-snug ${on ? "text-bone/75" : "text-smoke"}`}>
                    {a.short_desc}
                  </div>
                  <div
                    className={`font-mono text-[10px] uppercase tracking-wider mt-1.5 ${
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
                  <div className="display tabular text-lg">+{fmtUSD(adjustedPrice)}</div>
                  <div
                    className={`font-mono text-[10px] uppercase tracking-wider mt-1 px-1.5 py-0.5 inline-block ${
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

      <div className="bg-mist/40 p-4 mb-5">
        <div className="flex justify-between text-sm">
          <span className="text-smoke">{tier}</span>
          <span className="tabular">{fmtUSD(basePrice)}</span>
        </div>
        {selected.length > 0 && (
          <div className="flex justify-between text-sm mt-1">
            <span className="text-smoke">
              {t("addonsCount", { count: selected.length })}
            </span>
            <span className="tabular">+{fmtUSD(addonsTotal)}</span>
          </div>
        )}
        <div className="flex justify-between pt-2 mt-2 border-t border-bone">
          <span className="font-bold text-sm">{t("addonsRunningTotal")}</span>
          <span className="display tabular text-xl">{fmtUSD(total)}</span>
        </div>
      </div>

      <button
        onClick={continueNext}
        className="w-full bg-cobalt text-bone py-4 text-sm font-bold uppercase tracking-wide hover:bg-ink"
      >
        {selected.length === 0 ? t("addonsSkip") : t("addonsContinue")}
      </button>
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

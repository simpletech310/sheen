"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { AUTO_TIERS, fmtUSD } from "@/lib/pricing";
import { useTranslations } from "next-intl";

function TierPickerInner() {
  const router = useRouter();
  const params = useSearchParams();
  const t = useTranslations("appBook");
  const [selected, setSelected] = useState<string>(params.get("tier") ?? "Premium Detail");

  useEffect(() => {
    const t = params.get("tier");
    if (t) setSelected(t);
  }, [params]);

  function next() {
    const tier = AUTO_TIERS.find((t) => t.tier_name === selected);
    if (!tier) return;
    // Route through the add-ons step so the customer can stack
    // detailing extras on top before moving to vehicles.
    const url = new URL("/app/book/addons", window.location.origin);
    url.searchParams.set("tier", tier.tier_name);
    url.searchParams.set("price", String(tier.base_price_cents));
    url.searchParams.set("category", "auto");
    // Pass through @handle from /r/[handle] referral links so the customer
    // doesn't have to retype it at the address step.
    const handle = params.get("handle");
    if (handle) url.searchParams.set("handle", handle);
    router.push(url.pathname + url.search);
  }

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app" className="text-smoke text-sm">
          {t("back")}
        </Link>
      </div>
      <Eyebrow>{t("autoStep")}</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">{t("chooseTier")}</h1>
      <p className="text-xs text-smoke mb-5 leading-relaxed">
        {t("launchPromoNote")}
      </p>
      <div className="space-y-3">
        {AUTO_TIERS.map((t) => {
          const on = selected === t.tier_name;
          return (
            <button
              key={t.tier_name}
              onClick={() => setSelected(t.tier_name)}
              className={`w-full text-left p-5 transition ${
                on ? "bg-ink text-bone" : "bg-mist/50 hover:bg-mist text-ink"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0 pr-3">
                  <div className="display text-xl">{t.tier_name}</div>
                  <div className={`text-xs mt-1 ${on ? "text-bone/75" : "text-smoke"}`}>
                    {t.description}
                  </div>
                  <div className={`font-mono text-[10px] uppercase tracking-wider mt-1.5 ${on ? "text-sol/80" : "text-smoke"}`}>
                    {t.duration_minutes} min
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="display tabular text-2xl">{fmtUSD(t.base_price_cents)}</div>
                  {t.standard_price_cents && t.standard_price_cents > t.base_price_cents && (
                    <div className={`font-mono text-[10px] tabular line-through ${on ? "text-bone/50" : "text-smoke"}`}>
                      {fmtUSD(t.standard_price_cents)}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <button
        onClick={next}
        className="mt-7 w-full bg-cobalt text-bone rounded-full py-4 text-sm font-semibold"
      >
        {t("continueVehicles")}
      </button>
    </div>
  );
}

export default function TierPicker() {
  return (
    <Suspense>
      <TierPickerInner />
    </Suspense>
  );
}

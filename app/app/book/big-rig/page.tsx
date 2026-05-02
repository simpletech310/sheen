"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { BIG_RIG_TIERS, fmtUSD } from "@/lib/pricing";
import { useTranslations } from "next-intl";

function TierPickerInner() {
  const router = useRouter();
  const params = useSearchParams();
  const t = useTranslations("appBook");
  const [selected, setSelected] = useState<string>(params.get("tier") ?? "Trailer Wash");

  useEffect(() => {
    const tier = params.get("tier");
    if (tier) setSelected(tier);
  }, [params]);

  function next() {
    const tier = BIG_RIG_TIERS.find((t) => t.tier_name === selected);
    if (!tier) return;
    const url = new URL("/app/book/vehicles", window.location.origin);
    url.searchParams.set("tier", tier.tier_name);
    url.searchParams.set("price", String(tier.base_price_cents));
    url.searchParams.set("category", "big_rig");
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
      <Eyebrow>{t("bigRigStep")}</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">{t("chooseTierUpper")}</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-5" />
      <p className="text-xs text-smoke mb-5">
        {t("bigRigSubtypes")}
      </p>
      <div className="space-y-3">
        {BIG_RIG_TIERS.map((tier) => (
          <button
            key={tier.tier_name}
            onClick={() => setSelected(tier.tier_name)}
            className={`w-full text-left p-5 transition ${
              selected === tier.tier_name ? "bg-ink text-bone" : "bg-mist/50 hover:bg-mist text-ink"
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="display text-xl">{tier.tier_name}</div>
                <div className={`text-xs mt-1 ${selected === tier.tier_name ? "text-bone/70" : "text-smoke"}`}>
                  {tier.duration_minutes} min · {tier.included.slice(0, 3).join(", ")}…
                </div>
              </div>
              <div className="display tabular text-2xl">{fmtUSD(tier.base_price_cents)}</div>
            </div>
          </button>
        ))}
      </div>
      <button
        onClick={next}
        className="mt-7 w-full bg-royal text-bone py-4 text-sm font-bold uppercase tracking-wide hover:bg-ink"
      >
        {t("continueVehicles")}
      </button>
      <p className="text-[11px] text-smoke text-center mt-4">
        {t("bigRigGearNote")}
      </p>
    </div>
  );
}

export default function BigRigTierPicker() {
  return (
    <Suspense>
      <TierPickerInner />
    </Suspense>
  );
}

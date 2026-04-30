"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { AUTO_TIERS, fmtUSD } from "@/lib/pricing";

function TierPickerInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [selected, setSelected] = useState<string>(params.get("tier") ?? "Premium Detail");

  useEffect(() => {
    const t = params.get("tier");
    if (t) setSelected(t);
  }, [params]);

  function next() {
    const tier = AUTO_TIERS.find((t) => t.tier_name === selected);
    if (!tier) return;
    const url = new URL("/app/book/address", window.location.origin);
    url.searchParams.set("tier", tier.tier_name);
    url.searchParams.set("price", String(tier.base_price_cents));
    router.push(url.pathname + url.search);
  }

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app" className="text-smoke text-sm">
          ← Back
        </Link>
      </div>
      <Eyebrow>Step 1 / 3 · Pick your wash</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-6">Choose a tier</h1>
      <div className="space-y-3">
        {AUTO_TIERS.map((t) => (
          <button
            key={t.tier_name}
            onClick={() => setSelected(t.tier_name)}
            className={`w-full text-left p-5 transition ${
              selected === t.tier_name ? "bg-ink text-bone" : "bg-mist/50 hover:bg-mist text-ink"
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="display text-xl">{t.tier_name}</div>
                <div className={`text-xs mt-1 ${selected === t.tier_name ? "text-bone/70" : "text-smoke"}`}>
                  {t.duration_minutes} min · {t.included.slice(0, 3).join(", ")}…
                </div>
              </div>
              <div className="display tabular text-2xl">{fmtUSD(t.base_price_cents)}</div>
            </div>
          </button>
        ))}
      </div>
      <button
        onClick={next}
        className="mt-7 w-full bg-cobalt text-bone rounded-full py-4 text-sm font-semibold"
      >
        Continue · Address →
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

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { HOME_TIERS, fmtUSD } from "@/lib/pricing";

function HomeTierPickerInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [selected, setSelected] = useState<string>(
    params.get("tier") ?? HOME_TIERS[0].tier_name
  );
  const [qty, setQty] = useState<number>(1);

  useEffect(() => {
    const t = params.get("tier");
    if (t) setSelected(t);
  }, [params]);

  const tier = HOME_TIERS.find((t) => t.tier_name === selected);
  const isSolarPanel = selected === "Solar Panel Wash";
  const total = (tier?.base_price_cents ?? 0) * (isSolarPanel ? qty : 1);

  function next() {
    if (!tier) return;
    const url = new URL("/app/book/address", window.location.origin);
    url.searchParams.set("tier", tier.tier_name);
    url.searchParams.set("price", String(total));
    url.searchParams.set("category", "home");
    url.searchParams.set("count", "1"); // home doesn't multiply by vehicles
    if (isSolarPanel) url.searchParams.set("qty", String(qty));
    router.push(url.pathname + url.search);
  }

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app" className="text-smoke text-sm">
          ← Back
        </Link>
      </div>
      <Eyebrow>Step 1 / 3 · Pick your service</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">Home & power-wash</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-6" />

      <div className="space-y-3">
        {HOME_TIERS.map((t) => (
          <button
            key={t.tier_name}
            onClick={() => setSelected(t.tier_name)}
            className={`w-full text-left p-5 transition ${
              selected === t.tier_name ? "bg-ink text-bone" : "bg-mist/50 hover:bg-mist text-ink"
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 pr-3">
                <div className="display text-xl">{t.tier_name}</div>
                <div
                  className={`text-xs mt-1 ${
                    selected === t.tier_name ? "text-bone/70" : "text-smoke"
                  }`}
                >
                  {t.duration_minutes} min · {t.included.slice(0, 3).join(", ")}
                </div>
              </div>
              <div className="display tabular text-2xl whitespace-nowrap">
                {fmtUSD(t.base_price_cents)}
              </div>
            </div>
          </button>
        ))}
      </div>

      {isSolarPanel && (
        <div className="mt-5 bg-mist/40 p-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-smoke mb-3">
            How many panels?
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-10 h-10 bg-bone border border-mist text-xl"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={100}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
              className="flex-1 px-4 py-2 bg-bone border border-mist text-center text-lg font-mono tabular"
            />
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(100, q + 1))}
              className="w-10 h-10 bg-bone border border-mist text-xl"
            >
              +
            </button>
          </div>
          <div className="flex justify-between items-center mt-3 text-sm">
            <span className="text-smoke">{qty} panel{qty === 1 ? "" : "s"}</span>
            <span className="display tabular text-xl">{fmtUSD(total)}</span>
          </div>
        </div>
      )}

      <button
        onClick={next}
        className="mt-7 w-full bg-royal text-bone py-4 text-sm font-bold uppercase tracking-wide hover:bg-ink transition"
      >
        Continue · Where & when →
      </button>
    </div>
  );
}

export default function HomeTierPicker() {
  return (
    <Suspense>
      <HomeTierPickerInner />
    </Suspense>
  );
}

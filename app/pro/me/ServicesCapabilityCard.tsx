"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "@/components/ui/Toast";
import { ALL_ADDONS, type Addon } from "@/lib/addons";
import { tierRank, tierLabel, type Tier } from "@/lib/tier";
import { fmtUSD } from "@/lib/pricing";

type Props = {
  tier: Tier;
  initialCapabilities: Record<string, boolean>;
  canWashBigRig: boolean;
};

// Two-column grid of addons grouped by category. Each addon is
// either:
//   - actionable: a checkbox the pro can flip (their tier clears it)
//   - locked: dimmed with "Unlocks at <tier>" tooltip
//
// Big-rig addons are also hidden if can_wash_big_rig is off, since
// even Legend pros can't claim big-rig jobs without that flag.
export function ServicesCapabilityCard({ tier, initialCapabilities, canWashBigRig }: Props) {
  const t = useTranslations("proMe");
  const router = useRouter();
  const myRank = tierRank(tier);
  const [caps, setCaps] = useState<Record<string, boolean>>(initialCapabilities ?? {});
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(addon: Addon) {
    if (tierRank(addon.required_tier) > myRank) return;
    if (addon.category === "big_rig" && !canWashBigRig) return;

    const next = !caps[addon.code];
    const optimistic = { ...caps, [addon.code]: next };
    setCaps(optimistic);
    setBusy(addon.code);
    try {
      const r = await fetch("/api/washers/capabilities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capabilities: { [addon.code]: next } }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || t("capsErrorUpdate"));
      setCaps(data.capabilities ?? optimistic);
      router.refresh();
    } catch (e: any) {
      // Roll back
      setCaps(caps);
      toast(e.message || t("capsErrorUpdate"), "error");
    } finally {
      setBusy(null);
    }
  }

  const groups: { category: "auto" | "big_rig"; titleKey: string }[] = [
    { category: "auto", titleKey: "capsGroupAuto" },
    { category: "big_rig", titleKey: "capsGroupBigRig" },
  ];

  return (
    <div className="bg-white/5 p-4 mb-3 border-l-2 border-sol">
      <div className="font-mono text-[10px] uppercase opacity-60 tracking-wider mb-1">
        {t("capsLabel")}
      </div>
      <div className="text-sm font-bold mb-1">{t("capsHeadline")}</div>
      <div className="text-xs text-bone/60 mb-4 leading-relaxed">
        {t("capsDescPrefix")}{" "}
        <span className="text-sol font-semibold">{tierLabel(tier)}</span>
        {t("capsDescSuffix")}
      </div>

      {groups.map((g) => {
        const items = ALL_ADDONS.filter((a) => a.category === g.category);
        if (g.category === "big_rig" && !canWashBigRig) {
          return (
            <div key={g.category} className="mb-4">
              <div className="font-mono text-[10px] uppercase tracking-wider text-bone/50 mb-2">
                {t(g.titleKey as any)}
              </div>
              <div className="text-xs text-bone/40 italic">
                {t("capsBigRigGated")}
              </div>
            </div>
          );
        }
        return (
          <div key={g.category} className="mb-4 last:mb-0">
            <div className="font-mono text-[10px] uppercase tracking-wider text-bone/50 mb-2">
              {t(g.titleKey as any)}
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {items.map((addon) => {
                const locked = tierRank(addon.required_tier) > myRank;
                const on = !!caps[addon.code];
                return (
                  <button
                    key={addon.code}
                    onClick={() => toggle(addon)}
                    disabled={locked || busy === addon.code}
                    className={`text-left p-3 transition border ${
                      locked
                        ? "bg-white/[0.02] border-bone/5 opacity-50 cursor-not-allowed"
                        : on
                        ? "bg-sol/10 border-sol"
                        : "bg-white/5 border-bone/10 hover:border-bone/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold">{addon.name}</div>
                        <div className="text-[11px] text-bone/55 mt-0.5 leading-snug">
                          {addon.short_desc}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] tabular">
                          <span className="text-sol font-bold">
                            +{fmtUSD(addon.washer_payout_cents)}
                          </span>
                          <span className="text-bone/40">
                            {addon.duration_minutes}m
                          </span>
                          {locked && (
                            <span className="font-mono uppercase tracking-wider text-bone/50">
                              {t("capsLockedAt", { tier: tierLabel(addon.required_tier) })}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 ${
                          locked
                            ? "bg-bone/5 text-bone/30"
                            : on
                            ? "bg-sol text-ink"
                            : "bg-bone/10 text-bone/60"
                        }`}
                      >
                        {locked ? t("capsLocked") : on ? t("capsOn") : t("capsOff")}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";
import { useTranslations } from "next-intl";

export function BigRigCapabilityCard({ initialCapable }: { initialCapable: boolean }) {
  const t = useTranslations("proMe");
  const router = useRouter();
  const [capable, setCapable] = useState(initialCapable);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(next: boolean) {
    setBusy(true);
    try {
      const r = await fetch("/api/washers/big-rig-capability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ can_wash_big_rig: next }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || t("bigRigErrorUpdate"));
      }
      setCapable(next);
      setConfirming(false);
      toast(
        next ? t("bigRigToastOn") : t("bigRigToastOff"),
        "success"
      );
      router.refresh();
    } catch (e: any) {
      toast(e.message || t("bigRigErrorUpdate"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white/5 p-4 mb-3 border-l-2 border-sol">
      <div className="flex justify-between items-start">
        <div className="flex-1 pr-3">
          <div className="font-mono text-[10px] uppercase opacity-60 tracking-wider">
            {t("bigRigServiceLabel")}
          </div>
          <div className="text-sm font-bold mt-1">
            {capable ? t("bigRigCapableHeadline") : t("bigRigIncapableHeadline")}
          </div>
          <div className="text-xs text-bone/60 mt-1 leading-relaxed">
            {t("bigRigDesc")}{" "}
            <span className="text-sol font-semibold">{t("bigRigPayMultiplier")}</span>{" "}
            {t("bigRigDescSuffix")}
          </div>
        </div>
        <span
          className={`shrink-0 font-mono text-[10px] uppercase tracking-wider px-2 py-1 ${
            capable ? "bg-sol text-ink" : "bg-bone/10 text-bone/60"
          }`}
        >
          {capable ? t("bigRigOn") : t("bigRigOff")}
        </span>
      </div>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          disabled={busy}
          className={`mt-3 w-full py-2.5 text-xs font-bold uppercase tracking-wide transition disabled:opacity-50 ${
            capable
              ? "bg-bone/10 text-bone hover:bg-bad"
              : "bg-sol text-ink hover:bg-bone"
          }`}
        >
          {capable ? t("bigRigTurnOff") : t("bigRigTurnOn")}
        </button>
      ) : (
        <div className="mt-3 bg-ink/40 p-3">
          <p className="text-[11px] text-bone/80 mb-3 leading-relaxed">
            {capable
              ? t("bigRigConfirmOff")
              : t("bigRigConfirmOn")}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => save(!capable)}
              disabled={busy}
              className="flex-1 bg-sol text-ink py-2 text-xs font-bold uppercase tracking-wide disabled:opacity-50"
            >
              {busy ? "…" : capable ? t("bigRigConfirmOffBtn") : t("bigRigConfirmOnBtn")}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="px-3 bg-bone text-ink py-2 text-xs font-bold uppercase tracking-wide"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

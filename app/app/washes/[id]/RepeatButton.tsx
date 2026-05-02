"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";
import { useTranslations } from "next-intl";

export function RepeatButton({
  serviceId,
  addressId,
  vehicleIds,
  preferredWindow,
}: {
  serviceId: string;
  addressId: string | null;
  vehicleIds: string[];
  preferredWindow: string;
}) {
  const t = useTranslations("appWashes");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [freq, setFreq] = useState<"weekly" | "biweekly" | "monthly">("biweekly");
  const [busy, setBusy] = useState(false);

  const FREQUENCIES = [
    { v: "weekly", l: t("freqWeekly") },
    { v: "biweekly", l: t("freqBiweekly") },
    { v: "monthly", l: t("freqMonthly") },
  ];

  async function submit() {
    setBusy(true);
    try {
      const r = await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: serviceId,
          address_id: addressId,
          vehicle_ids: vehicleIds,
          frequency: freq,
          preferred_window: preferredWindow,
          start_in_days: freq === "weekly" ? 7 : freq === "biweekly" ? 14 : 30,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || t("repeatErrorDefault"));
      toast(t("repeatSaved"), "success");
      router.push("/app/me/recurring");
    } catch (e: any) {
      toast(e.message || t("repeatErrorDefault"), "error");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full bg-bone border border-mist text-ink py-3 text-xs font-bold uppercase tracking-wide hover:bg-mist transition"
      >
        {t("makeRecurring")}
      </button>
    );
  }

  return (
    <div className="mt-3 bg-mist/40 p-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-smoke mb-3">
        {t("howOften")}
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {FREQUENCIES.map((f) => (
          <button
            key={f.v}
            type="button"
            onClick={() => setFreq(f.v as any)}
            className={`p-3 text-xs font-medium ${
              freq === f.v ? "bg-ink text-bone" : "bg-bone hover:bg-mist"
            }`}
          >
            {f.l}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={busy}
          className="flex-1 bg-royal text-bone py-3 text-xs font-bold uppercase tracking-wide disabled:opacity-50 hover:bg-ink"
        >
          {busy ? t("repeatSavingBusy") : t("saveSchedule")}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-4 bg-mist text-ink py-3 text-xs font-bold uppercase tracking-wide"
        >
          {t("cancelAction")}
        </button>
      </div>
      <p className="text-[11px] text-smoke mt-2">
        {t("repeatNote")}
      </p>
    </div>
  );
}

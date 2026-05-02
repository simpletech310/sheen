"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";
import { useTranslations } from "next-intl";

/**
 * Manual "Start work" button for the pro. Calls /api/bookings/[id]/start
 * directly so the washer doesn't have to wait for the customer to scan
 * the QR — useful when the customer's not technical, the phone's dead,
 * or they verbally agree the pro is on site.
 *
 * Surfaces errors inline (the silent useEffect on the timer page used
 * to swallow failures, which is exactly what was leaving jobs stuck
 * in 'arrived').
 */
export function StartWorkButton({
  jobId,
  primary,
}: {
  jobId: string;
  primary?: boolean;
}) {
  const t = useTranslations("proJobs");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    try {
      const r = await fetch(`/api/bookings/${jobId}/start`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(d.error || t("startError", { status: r.status }));
      }
      toast(t("timerStarted"), "success");
      router.push(`/pro/jobs/${jobId}/timer`);
      router.refresh();
    } catch (e: any) {
      toast(e.message || t("couldNotStart"), "error");
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={busy}
      className={`block w-full py-4 text-sm font-bold uppercase tracking-wide text-center transition disabled:opacity-50 ${
        primary
          ? "bg-sol text-ink hover:bg-bone"
          : "bg-bone/10 text-bone hover:bg-bone hover:text-ink"
      }`}
    >
      {busy ? t("starting") : t("startWork")}
    </button>
  );
}

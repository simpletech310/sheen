"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";
import { useTranslations } from "next-intl";

export function StatusButtons({ jobId, mapsUrl }: { jobId: string; mapsUrl: string }) {
  const t = useTranslations("proJobs");
  const router = useRouter();
  const [busy, setBusy] = useState<"none" | "enroute" | "arrived">("none");
  const [err, setErr] = useState<string | null>(null);

  async function startEnRoute() {
    setBusy("enroute");
    setErr(null);
    try {
      await fetch(`/api/bookings/${jobId}/en-route`, { method: "POST" });
      toast(t("enRouteNotified"), "success");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      // Open the customer's mapping app regardless.
      window.location.href = mapsUrl;
    }
  }

  async function arrived() {
    setBusy("arrived");
    setErr(null);
    try {
      const r = await fetch(`/api/bookings/${jobId}/arrived`, { method: "POST" });
      if (!r.ok) throw new Error((await r.json()).error || t("arrivedFailed"));
      toast(t("arrivedNotified"), "success");
      router.push(`/pro/jobs/${jobId}/checkin`);
    } catch (e: any) {
      setErr(e.message);
      toast(e.message || t("couldNotUpdateStatus"), "error");
      setBusy("none");
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={startEnRoute}
          disabled={busy !== "none"}
          className="bg-bone text-ink py-3 text-sm font-bold uppercase text-center disabled:opacity-50"
        >
          {busy === "enroute" ? t("openingMaps") : t("openInMaps")}
        </button>
        <button
          onClick={arrived}
          disabled={busy !== "none"}
          className="bg-sol text-ink py-3 text-sm font-bold uppercase text-center hover:bg-bone disabled:opacity-50"
        >
          {busy === "arrived" ? "…" : t("iveArrived")}
        </button>
      </div>
      {err && <div className="mt-2 text-xs text-bad">{err}</div>}
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";
import { useTranslations } from "next-intl";

export function RequestActions({
  jobId,
  expiresAtIso,
}: {
  jobId: string;
  expiresAtIso: string;
}) {
  const t = useTranslations("proQueue");
  const router = useRouter();
  const [busy, setBusy] = useState<"none" | "accept" | "decline">("none");
  const [now, setNow] = useState(() => Date.now());

  // Live countdown.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const expiresMs = new Date(expiresAtIso).getTime();
  const remaining = Math.max(0, expiresMs - now);
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const expired = remaining === 0;

  async function accept() {
    setBusy("accept");
    try {
      const r = await fetch(`/api/bookings/${jobId}/accept-request`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || t("acceptError"));
      toast(t("requestAccepted"), "success");
      router.push(`/pro/jobs/${jobId}/navigate`);
    } catch (e: any) {
      toast(e.message || t("acceptError"), "error");
      setBusy("none");
    }
  }

  async function decline() {
    if (!confirm(t("declineConfirm"))) return;
    setBusy("decline");
    try {
      const r = await fetch(`/api/bookings/${jobId}/decline-request`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || t("declineError"));
      toast(t("requestDeclined"), "info");
      router.push("/pro/queue");
      router.refresh();
    } catch (e: any) {
      toast(e.message || t("declineError"), "error");
      setBusy("none");
    }
  }

  return (
    <div className="bg-sol/15 border border-sol p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-[10px] uppercase tracking-wider text-sol">
          {t("directRequestBadge")}
        </div>
        <div className="display tabular text-2xl text-sol">
          {expired ? "00:00" : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`}
        </div>
      </div>
      <div className="text-xs text-bone/80 mb-4 leading-relaxed">
        {t("directRequestDescription")}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={decline}
          disabled={busy !== "none" || expired}
          className="bg-bone/10 text-bone py-3 text-sm font-bold uppercase tracking-wide hover:bg-bone/20 disabled:opacity-50"
        >
          {busy === "decline" ? "…" : t("decline")}
        </button>
        <button
          onClick={accept}
          disabled={busy !== "none" || expired}
          className="bg-sol text-ink py-3 text-sm font-bold uppercase tracking-wide hover:bg-bone disabled:opacity-50"
        >
          {busy === "accept" ? "…" : expired ? t("expired") : t("accept")}
        </button>
      </div>
    </div>
  );
}

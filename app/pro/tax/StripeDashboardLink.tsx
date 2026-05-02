"use client";

import { useState } from "react";
import { toast } from "@/components/ui/Toast";
import { useTranslations } from "next-intl";

export function StripeDashboardLink({ connected }: { connected: boolean }) {
  const t = useTranslations("proTax");
  const [busy, setBusy] = useState(false);

  async function open() {
    setBusy(true);
    try {
      const r = await fetch("/api/stripe/dashboard-link", { method: "POST" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || t("dashboardOpenFailed"));
      }
      const { url } = await r.json();
      window.location.href = url;
    } catch (e: any) {
      toast(e.message || t("dashboardOpenFailed"), "error");
      setBusy(false);
    }
  }

  if (!connected) {
    return (
      <a
        href="/pro/verify"
        className="mt-4 block w-full py-3 text-center text-xs font-bold uppercase tracking-wide bg-bone/10 text-bone hover:bg-bone hover:text-ink transition"
      >
        {t("setUpPayoutsFirst")}
      </a>
    );
  }

  return (
    <button
      onClick={open}
      disabled={busy}
      className="mt-4 w-full py-3 text-xs font-bold uppercase tracking-wide bg-sol text-ink hover:bg-bone disabled:opacity-50"
    >
      {busy ? t("opening") : t("openDashboardBtn")}
    </button>
  );
}

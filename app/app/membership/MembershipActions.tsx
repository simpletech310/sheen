"use client";

import { useState } from "react";
import { toast } from "@/components/ui/Toast";
import { useTranslations } from "next-intl";

export function MembershipActions({
  planId,
  isCurrent,
  hasActive,
  disabled,
  isPaused,
}: {
  planId?: string;
  isCurrent?: boolean;
  hasActive?: boolean;
  disabled?: boolean;
  isPaused?: boolean;
}) {
  const t = useTranslations("appMembership");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function subscribe() {
    if (!planId) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/stripe/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId }),
      });
      const d = await r.json();
      if (d.url) window.location.href = d.url;
      else {
        setErr(d.error || t("subscribeError"));
        toast(d.error || t("subscribeError"), "error");
      }
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!confirm(t("cancelConfirm"))) return;
    setBusy(true);
    try {
      const r = await fetch("/api/stripe/subscriptions", { method: "DELETE" });
      if (r.ok) {
        toast(t("cancelSuccess"), "success");
        window.location.reload();
      } else {
        const d = await r.json();
        setErr(d.error || t("cancelError"));
        toast(d.error || t("cancelError"), "error");
      }
    } finally {
      setBusy(false);
    }
  }

  async function pauseOrResume(action: "pause" | "resume") {
    setBusy(true);
    try {
      const r = await fetch("/api/stripe/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (r.ok) {
        toast(action === "pause" ? t("pauseSuccess") : t("resumeSuccess"), "success");
        window.location.reload();
      } else {
        const d = await r.json();
        toast(d.error || t("updateError"), "error");
      }
    } finally {
      setBusy(false);
    }
  }

  if (!planId) {
    // Action row on the active membership banner
    return (
      <div className="flex flex-wrap gap-3 mt-3">
        <button
          onClick={() => pauseOrResume(isPaused ? "resume" : "pause")}
          disabled={busy}
          className="text-xs underline opacity-80 disabled:opacity-50"
        >
          {busy ? "…" : isPaused ? t("resume") : t("pauseBilling")}
        </button>
        <button
          onClick={cancel}
          disabled={busy}
          className="text-xs underline opacity-80 disabled:opacity-50"
        >
          {busy ? "…" : t("cancelAtPeriodEnd")}
        </button>
      </div>
    );
  }

  if (isCurrent) {
    return <div className="font-mono text-xs text-royal uppercase tracking-wide">{t("currentPlan")}</div>;
  }

  return (
    <>
      <button
        onClick={subscribe}
        disabled={busy || disabled}
        className="bg-ink text-bone px-5 py-2.5 text-xs font-bold uppercase tracking-wide disabled:opacity-50"
      >
        {disabled ? t("comingSoon") : busy ? t("redirecting") : hasActive ? t("switchPlan") : t("subscribe")}
      </button>
      {err && <div className="text-xs text-bad mt-2">{err}</div>}
    </>
  );
}

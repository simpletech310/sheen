"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";
import { useTranslations } from "next-intl";

export function BackgroundCheckStep({
  status,
  verified,
}: {
  status: string;
  verified: boolean;
}) {
  const t = useTranslations("proVerify");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  let pill: { tone: "good" | "sol" | "bad"; label: string };
  if (verified || status === "verified") pill = { tone: "good", label: t("bgVerified") };
  else if (status === "denied") pill = { tone: "bad", label: t("bgDenied") };
  else if (status === "pending") pill = { tone: "sol", label: t("bgInReview") };
  else pill = { tone: "sol", label: t("bgTodo") };

  async function submit() {
    setBusy(true);
    try {
      const r = await fetch("/api/pro/background-check", { method: "POST" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || t("bgSubmitFailed"));
      }
      toast(t("bgSubmittedToast"), "success");
      router.refresh();
    } catch (e: any) {
      toast(e.message || t("bgSubmitFailed"), "error");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = status === "not_submitted" || status === "denied";

  return (
    <div
      className={`p-5 border-l-2 ${
        pill.tone === "good"
          ? "bg-good/10 border-good"
          : pill.tone === "bad"
          ? "bg-bad/15 border-bad"
          : "bg-white/5 border-sol"
      }`}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-wider opacity-60">
            {t("bgStepLabel")}
          </div>
          <div className="text-sm font-bold mt-1">
            {pill.tone === "good"
              ? t("bgCheckVerifiedTitle")
              : status === "pending"
              ? t("bgUnderReviewTitle")
              : t("bgSubmitTitle")}
          </div>
          <p className="text-[12px] text-bone/65 mt-1.5 leading-relaxed">
            {t("bgDesc")}
          </p>
        </div>
        <span
          className={`shrink-0 font-mono text-[10px] uppercase tracking-wider px-2 py-1 ${
            pill.tone === "good"
              ? "bg-good text-ink"
              : pill.tone === "bad"
              ? "bg-bad text-bone"
              : "bg-sol text-ink"
          }`}
        >
          {pill.label}
        </span>
      </div>
      {canSubmit ? (
        <button
          onClick={submit}
          disabled={busy}
          className="mt-4 w-full py-3 text-xs font-bold uppercase tracking-wide bg-sol text-ink hover:bg-bone disabled:opacity-50"
        >
          {busy ? t("bgSubmitting") : status === "denied" ? t("bgResubmitBtn") : t("bgSubmitBtn")}
        </button>
      ) : status === "pending" ? (
        <div className="mt-4 bg-bone/5 px-3 py-2 text-[11px] text-bone/60 font-mono">
          {t("bgPendingSla")}
        </div>
      ) : null}
    </div>
  );
}

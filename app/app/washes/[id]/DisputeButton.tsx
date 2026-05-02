"use client";

import { useState } from "react";
import { toast } from "@/components/ui/Toast";
import { useTranslations } from "next-intl";

export function DisputeButton({ bookingId }: { bookingId: string }) {
  const t = useTranslations("appWashes");
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setErr(null);
    try {
      const r = await fetch(`/api/bookings/${bookingId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          amount_cents: amount ? Math.round(Number(amount) * 100) : undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || t("disputeErrorDefault"));
      setDone(true);
      toast(t("disputeSuccess"), "success");
    } catch (e: any) {
      setErr(e.message);
      toast(e.message || t("disputeErrorDefault"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mt-6 bg-good/15 text-ink p-5">
        <div className="font-bold uppercase tracking-wide text-sm">{t("claimFiled")}</div>
        <p className="text-xs mt-2">
          {t("claimFiledNote")}
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-6 w-full bg-mist text-ink py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-bad hover:text-bone"
      >
        {t("reportDamage")}
      </button>
    );
  }

  return (
    <div className="mt-6 bg-mist/40 p-5">
      <div className="font-bold uppercase tracking-wide text-sm mb-3">{t("reportDamage")}</div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={t("disputeDescPlaceholder")}
        rows={4}
        className="w-full px-3 py-3 bg-bone border border-mist text-sm"
      />
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder={t("disputeAmountPlaceholder")}
        inputMode="decimal"
        className="w-full px-3 py-3 bg-bone border border-mist text-sm mt-2"
      />
      {err && <div className="text-sm text-bad mt-2">{err}</div>}
      <div className="flex gap-2 mt-3">
        <button
          onClick={submit}
          disabled={submitting || description.length < 10}
          className="flex-1 bg-bad text-bone py-3 text-sm font-bold uppercase tracking-wide disabled:opacity-50"
        >
          {submitting ? t("disputeFiling") : t("submitClaim")}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-4 bg-mist text-ink py-3 text-sm font-bold uppercase tracking-wide"
        >
          {t("cancelAction")}
        </button>
      </div>
    </div>
  );
}

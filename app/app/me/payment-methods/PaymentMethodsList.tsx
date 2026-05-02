"use client";

import { useEffect, useState } from "react";
import { toast } from "@/components/ui/Toast";
import { useTranslations } from "next-intl";

type PM = {
  id: string;
  brand: string;
  last4: string;
  exp_month: number | null;
  exp_year: number | null;
};

const BRAND_LABEL: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  discover: "Discover",
  jcb: "JCB",
  diners: "Diners",
  unionpay: "UnionPay",
};

export function PaymentMethodsList() {
  const t = useTranslations("appPayments");
  const [methods, setMethods] = useState<PM[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/stripe/payment-methods")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setMethods(d.payment_methods ?? []);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  async function remove(id: string) {
    if (!confirm(t("confirmRemove"))) return;
    setRemoving(id);
    try {
      const r = await fetch(`/api/stripe/payment-methods/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || t("errorFailed"));
      }
      setMethods((prev) => prev.filter((m) => m.id !== id));
      toast(t("toastRemoved"), "success");
    } catch (e: any) {
      toast(e.message || t("errorRemove"), "error");
    } finally {
      setRemoving(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-16 bg-mist/60 animate-pulse" />
        <div className="h-16 bg-mist/60 animate-pulse" />
      </div>
    );
  }

  if (methods.length === 0) {
    return (
      <div className="bg-mist/40 p-6 text-sm text-smoke text-center">
        {t("noCards")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {methods.map((m) => (
        <div
          key={m.id}
          className="bg-bone border border-mist p-4 flex justify-between items-center"
        >
          <div>
            <div className="text-sm font-semibold">
              {BRAND_LABEL[m.brand] ?? m.brand} ···· {m.last4}
            </div>
            {m.exp_month && m.exp_year && (
              <div className="text-xs text-smoke font-mono mt-0.5 tabular">
                {t("expiry", {
                  month: String(m.exp_month).padStart(2, "0"),
                  year: String(m.exp_year).slice(-2),
                })}
              </div>
            )}
          </div>
          <button
            onClick={() => remove(m.id)}
            disabled={removing === m.id}
            className="font-mono text-[10px] uppercase tracking-wider text-bad hover:underline disabled:opacity-50"
          >
            {removing === m.id ? "…" : t("removeBtn")}
          </button>
        </div>
      ))}
    </div>
  );
}

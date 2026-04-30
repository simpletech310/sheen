"use client";

import { useEffect, useState } from "react";
import { toast } from "@/components/ui/Toast";

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
    if (!confirm("Remove this card? You can add it again at checkout.")) return;
    setRemoving(id);
    try {
      const r = await fetch(`/api/stripe/payment-methods/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || "Failed");
      }
      setMethods((prev) => prev.filter((m) => m.id !== id));
      toast("Card removed", "success");
    } catch (e: any) {
      toast(e.message || "Could not remove", "error");
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
        No saved cards yet. Book a wash and your card will save here.
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
                Exp {String(m.exp_month).padStart(2, "0")}/{String(m.exp_year).slice(-2)}
              </div>
            )}
          </div>
          <button
            onClick={() => remove(m.id)}
            disabled={removing === m.id}
            className="font-mono text-[10px] uppercase tracking-wider text-bad hover:underline disabled:opacity-50"
          >
            {removing === m.id ? "…" : "Remove"}
          </button>
        </div>
      ))}
    </div>
  );
}

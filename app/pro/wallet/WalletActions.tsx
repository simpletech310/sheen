"use client";

import { useEffect, useState } from "react";
import { fmtUSD } from "@/lib/pricing";

type PayoutResult = {
  payout_id: string;
  amount: number;
  method: "instant" | "standard" | string;
  arrival_date: number | null;
  hint?: string | null;
};

function formatArrival(unixSeconds: number | null) {
  if (!unixSeconds) return null;
  const d = new Date(unixSeconds * 1000);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay) {
    return `today, ${d.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function WalletActions() {
  // The amount the Cash Out button can actually withdraw right now —
  // max(available, instant_available). Instant payouts can draw on
  // funds that haven't fully settled yet, which is what lets a freshly
  // funded wash hit the bank without a 1-2 day wait.
  const [cashable, setCashable] = useState<number | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [busy, setBusy] = useState<"none" | "instant" | "dashboard">("none");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<PayoutResult | null>(null);

  async function loadBalance() {
    const r = await fetch("/api/stripe/balance");
    const d = await r.json();
    const av = Number(d.available_cents ?? 0);
    const ia = Number(d.instant_available_cents ?? 0);
    setCashable(Math.max(av, ia));
    setConnected(!!d.connected);
  }

  useEffect(() => {
    loadBalance();
  }, []);

  async function instant() {
    setBusy("instant");
    setError(null);
    setSuccess(null);
    try {
      const r = await fetch("/api/stripe/payouts/instant", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Cash out failed");
      setSuccess({
        payout_id: d.payout_id,
        amount: d.amount,
        method: d.method,
        arrival_date: d.arrival_date ?? null,
        hint: d.hint ?? null,
      });
      await loadBalance();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy("none");
    }
  }

  async function openDashboard() {
    setBusy("dashboard");
    try {
      const r = await fetch("/api/stripe/dashboard-link", { method: "POST" });
      const d = await r.json();
      if (d.url) window.open(d.url, "_blank");
      else setError(d.error || "Could not open dashboard");
    } finally {
      setBusy("none");
    }
  }

  const canCashOut = connected && busy === "none" && (cashable ?? 0) > 0;

  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={instant}
          disabled={!canCashOut}
          className="bg-ink text-bone py-3 text-xs font-bold uppercase tracking-wide disabled:opacity-50"
        >
          {busy === "instant"
            ? "…"
            : cashable && cashable > 0
            ? `Cash out ${fmtUSD(cashable)}`
            : "Cash out (1.5%)"}
        </button>
        <button
          onClick={openDashboard}
          disabled={!connected || busy !== "none"}
          className="bg-bone text-ink py-3 text-xs font-bold uppercase tracking-wide disabled:opacity-50"
        >
          {busy === "dashboard" ? "…" : "Tax & 1099 →"}
        </button>
      </div>
      {success && (
        <div className="mt-3 bg-ink text-bone p-3 leading-snug">
          <div className="font-mono text-[10px] uppercase tracking-wider text-good">
            ✓ Cashed out · verified by Stripe
          </div>
          <div className="display tabular text-2xl mt-1">{fmtUSD(success.amount)}</div>
          <div className="text-[11px] text-bone/75 mt-1">
            {success.method === "instant"
              ? "Instant payout — usually arrives in minutes."
              : success.method === "standard"
              ? "Standard payout — arrives in 1–2 business days."
              : `Method: ${success.method}`}
            {formatArrival(success.arrival_date) && (
              <>
                {" "}
                Expected{" "}
                <span className="text-sol font-mono">
                  {formatArrival(success.arrival_date)}
                </span>
                .
              </>
            )}
          </div>
          <div className="mt-1 font-mono text-[9px] text-bone/50 truncate">
            id {success.payout_id}
          </div>
          {success.hint && (
            <div className="mt-2 text-[11px] text-sol/90 leading-relaxed">
              {success.hint}
            </div>
          )}
        </div>
      )}
      {error && (
        <div className="mt-3 bg-bad/10 text-bad border-l-2 border-bad px-3 py-2 text-xs leading-snug">
          {error}
        </div>
      )}
    </div>
  );
}

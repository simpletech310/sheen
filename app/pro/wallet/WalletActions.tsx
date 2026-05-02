"use client";

import { useEffect, useState } from "react";
import { fmtUSD } from "@/lib/pricing";

export function WalletActions() {
  // The amount the Cash Out button can actually withdraw right now —
  // max(available, instant_available). Instant payouts can draw on
  // funds that haven't fully settled yet, which is what lets a freshly
  // funded wash hit the bank without a 1-2 day wait.
  const [cashable, setCashable] = useState<number | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [busy, setBusy] = useState<"none" | "instant" | "dashboard">("none");
  const [msg, setMsg] = useState<string | null>(null);

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
    setMsg(null);
    try {
      const r = await fetch("/api/stripe/payouts/instant", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Cash out failed");
      const label = d.method === "standard" ? "Standard payout" : "Instant payout";
      setMsg(
        `${label} of ${fmtUSD(d.amount)} initiated.${d.hint ? " " + d.hint : ""}`
      );
      await loadBalance();
    } catch (e: any) {
      setMsg(e.message);
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
      else setMsg(d.error || "Could not open dashboard");
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
      {msg && (
        <div className="text-xs mt-3 bg-ink/10 px-2 py-1 font-mono leading-snug">
          {msg}
        </div>
      )}
    </div>
  );
}

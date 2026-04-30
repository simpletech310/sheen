"use client";

import { useEffect, useState } from "react";
import { fmtUSD } from "@/lib/pricing";

export function WalletActions() {
  const [available, setAvailable] = useState<number | null>(null);
  const [pendingStripe, setPendingStripe] = useState<number | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [busy, setBusy] = useState<"none" | "instant" | "dashboard">("none");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/stripe/balance");
      const d = await r.json();
      setAvailable(d.available_cents ?? 0);
      setPendingStripe(d.pending_cents ?? 0);
      setConnected(!!d.connected);
    })();
  }, []);

  async function instant() {
    setBusy("instant");
    setMsg(null);
    try {
      const r = await fetch("/api/stripe/payouts/instant", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      setMsg(`Instant payout of ${fmtUSD(d.amount)} initiated.`);
      // refresh balance
      const b = await (await fetch("/api/stripe/balance")).json();
      setAvailable(b.available_cents ?? 0);
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

  return (
    <div className="mt-5 bg-sol p-5 text-ink">
      <div className="font-mono text-[10px] uppercase opacity-80">Stripe available balance</div>
      <div className="display tabular text-4xl mt-1">
        {available == null ? "…" : fmtUSD(available)}
      </div>
      <div className="text-xs opacity-70 mt-1">
        {pendingStripe ? `${fmtUSD(pendingStripe)} pending settlement` : connected ? "Connected" : "Stripe not connected — finish onboarding."}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          onClick={instant}
          disabled={!connected || busy !== "none" || (available ?? 0) <= 0}
          className="bg-ink text-bone py-3 text-xs font-bold uppercase tracking-wide disabled:opacity-50"
        >
          {busy === "instant" ? "…" : "Cash out (1.5%)"}
        </button>
        <button
          onClick={openDashboard}
          disabled={!connected || busy !== "none"}
          className="bg-bone text-ink py-3 text-xs font-bold uppercase tracking-wide disabled:opacity-50"
        >
          {busy === "dashboard" ? "…" : "Tax & 1099 →"}
        </button>
      </div>
      {msg && <div className="text-xs mt-3 bg-ink/10 px-2 py-1">{msg}</div>}
    </div>
  );
}

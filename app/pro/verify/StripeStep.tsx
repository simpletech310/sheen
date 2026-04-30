"use client";

import { useState } from "react";
import { toast } from "@/components/ui/Toast";

export function StripeStep({ connected }: { connected: boolean }) {
  const [busy, setBusy] = useState(false);

  async function start(action: "onboard" | "dashboard") {
    setBusy(true);
    try {
      const path =
        action === "onboard"
          ? "/api/stripe/connect-onboard"
          : "/api/stripe/dashboard-link";
      const r = await fetch(path, { method: "POST" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || `Payouts ${action} failed`);
      }
      const { url } = await r.json();
      window.location.href = url;
    } catch (e: any) {
      toast(e.message, "error");
      setBusy(false);
    }
  }

  return (
    <div
      className={`p-5 border-l-2 ${
        connected ? "bg-good/10 border-good" : "bg-white/5 border-sol"
      }`}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-wider opacity-60">
            Step 01 · Payouts
          </div>
          <div className="text-sm font-bold mt-1">
            {connected ? "Payouts connected" : "Set up payouts"}
          </div>
          <p className="text-[12px] text-bone/65 mt-1.5 leading-relaxed">
            Link your bank or debit card. Tips paid same-day, instant cash-out
            available for 1.5%.
          </p>
        </div>
        <span
          className={`shrink-0 font-mono text-[10px] uppercase tracking-wider px-2 py-1 ${
            connected ? "bg-good text-ink" : "bg-bone/10 text-bone/60"
          }`}
        >
          {connected ? "Done" : "Todo"}
        </span>
      </div>
      <button
        onClick={() => start(connected ? "dashboard" : "onboard")}
        disabled={busy}
        className={`mt-4 w-full py-3 text-xs font-bold uppercase tracking-wide transition disabled:opacity-50 ${
          connected
            ? "bg-bone/10 text-bone hover:bg-bone hover:text-ink"
            : "bg-sol text-ink hover:bg-bone"
        }`}
      >
        {busy ? "…" : connected ? "View payouts dashboard →" : "Set up payouts →"}
      </button>
    </div>
  );
}

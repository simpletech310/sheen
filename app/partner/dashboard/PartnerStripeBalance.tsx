"use client";

import { useEffect, useState } from "react";

export function PartnerStripeBalance() {
  const [available, setAvailable] = useState<number | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/stripe/balance")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.error) setErr(d.error);
        setAvailable(d.available_cents ?? 0);
        setPending(d.pending_cents ?? 0);
        setConnected(!!d.connected);
      })
      .catch((e) => alive && setErr(e.message));
    return () => {
      alive = false;
    };
  }, []);

  const fmt = (c: number | null) =>
    c == null ? "…" : `$${(c / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-royal text-bone p-5">
        <div className="font-mono text-[10px] uppercase tracking-wider opacity-80">
          Available · Stripe
        </div>
        <div className="display tabular text-3xl mt-1">{fmt(available)}</div>
        <div className="text-[11px] opacity-70 mt-1">
          {connected === false ? "Connect Stripe to see balance" : "Ready to pay out"}
        </div>
      </div>
      <div className="bg-mist/40 p-5">
        <div className="font-mono text-[10px] uppercase tracking-wider text-smoke">
          Pending · Stripe
        </div>
        <div className="display tabular text-3xl mt-1">{fmt(pending)}</div>
        <div className="text-[11px] text-smoke mt-1">
          {err ? `Error: ${err}` : "Settling soon"}
        </div>
      </div>
    </div>
  );
}

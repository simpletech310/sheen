"use client";

import { useState } from "react";

export function ConnectStandardButton() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/stripe/connect-standard", { method: "POST" });
      const d = await r.json();
      if (d.url) window.location.href = d.url;
      else setErr(d.error || "Failed to start Stripe Connect");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={go}
        disabled={busy}
        className="bg-ink text-bone px-6 py-3 text-sm font-bold uppercase tracking-wide disabled:opacity-50"
      >
        {busy ? "Redirecting…" : "Connect Stripe →"}
      </button>
      {err && <div className="text-sm text-bad mt-2">{err}</div>}
    </div>
  );
}

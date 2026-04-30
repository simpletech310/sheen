"use client";

import { useState } from "react";

export function MembershipActions({
  planId,
  isCurrent,
  hasActive,
  disabled,
}: {
  planId?: string;
  isCurrent?: boolean;
  hasActive?: boolean;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function subscribe() {
    if (!planId) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/stripe/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId }),
      });
      const d = await r.json();
      if (d.url) window.location.href = d.url;
      else setErr(d.error || "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    try {
      const r = await fetch("/api/stripe/subscriptions", { method: "DELETE" });
      if (r.ok) window.location.reload();
      else {
        const d = await r.json();
        setErr(d.error || "Failed");
      }
    } finally {
      setBusy(false);
    }
  }

  if (!planId) {
    // Cancel button on the active membership banner
    return (
      <button
        onClick={cancel}
        disabled={busy}
        className="text-xs underline opacity-80 mt-3"
      >
        {busy ? "…" : "Cancel at period end"}
      </button>
    );
  }

  if (isCurrent) {
    return <div className="font-mono text-xs text-royal uppercase tracking-wide">★ Current plan</div>;
  }

  return (
    <>
      <button
        onClick={subscribe}
        disabled={busy || disabled}
        className="bg-ink text-bone px-5 py-2.5 text-xs font-bold uppercase tracking-wide disabled:opacity-50"
      >
        {disabled ? "Coming soon" : busy ? "Redirecting…" : hasActive ? "Switch plan →" : "Subscribe →"}
      </button>
      {err && <div className="text-xs text-bad mt-2">{err}</div>}
    </>
  );
}

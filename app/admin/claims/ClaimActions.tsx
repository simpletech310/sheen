"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClaimActions({
  claimId,
  bookingId,
  amountCents,
  status,
}: {
  claimId: string;
  bookingId: string;
  amountCents: number | null;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function approve() {
    setBusy(true);
    setMsg(null);
    try {
      const refundRes = await fetch("/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          amount_cents: amountCents,
          reverse_transfer: true,
          reason: "damage_claim_approved",
        }),
      });
      const r = await refundRes.json();
      if (!refundRes.ok) throw new Error(r.error || "Refund failed");

      await fetch("/api/admin/claim-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim_id: claimId, status: "paid" }),
      });
      router.refresh();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function deny() {
    setBusy(true);
    try {
      await fetch("/api/admin/claim-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim_id: claimId, status: "denied" }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (status !== "open") return null;
  return (
    <div className="mt-3 flex gap-2 items-center">
      <button
        onClick={approve}
        disabled={busy || !amountCents}
        className="bg-good text-bone px-4 py-2 text-[10px] font-bold uppercase tracking-wide disabled:opacity-50"
      >
        {busy ? "…" : "Approve & refund"}
      </button>
      <button
        onClick={deny}
        disabled={busy}
        className="bg-bad text-bone px-4 py-2 text-[10px] font-bold uppercase tracking-wide disabled:opacity-50"
      >
        Deny
      </button>
      {msg && <span className="text-xs text-bad">{msg}</span>}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";

export function CancelButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const r = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not cancel");
      toast("Booking cancelled · refund on the way", "success");
      router.push("/app/washes");
      router.refresh();
    } catch (e: any) {
      toast(e.message || "Could not cancel", "error");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full bg-mist text-ink py-3 text-xs font-bold uppercase tracking-wide hover:bg-bad hover:text-bone transition"
      >
        Cancel this wash
      </button>
    );
  }

  return (
    <div className="mt-3 bg-mist/40 p-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-smoke mb-2">
        Cancel this wash
      </div>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Optional · let us know why so we can do better next time"
        rows={3}
        maxLength={500}
        className="w-full px-3 py-2 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
      />
      <div className="flex gap-2 mt-3">
        <button
          onClick={submit}
          disabled={busy}
          className="flex-1 bg-bad text-bone py-3 text-xs font-bold uppercase tracking-wide disabled:opacity-50"
        >
          {busy ? "Cancelling…" : "Confirm cancel"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-4 bg-mist text-ink py-3 text-xs font-bold uppercase tracking-wide"
        >
          Keep
        </button>
      </div>
      <p className="text-[11px] text-smoke mt-2">
        Refunds the original payment, restores any redeemed points and
        membership allowance.
      </p>
    </div>
  );
}

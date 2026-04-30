"use client";

import { useState } from "react";
import { toast } from "@/components/ui/Toast";

export function DisputeButton({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setErr(null);
    try {
      const r = await fetch(`/api/bookings/${bookingId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          amount_cents: amount ? Math.round(Number(amount) * 100) : undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      setDone(true);
      toast("Claim filed — we’ll be in touch within 24 hours", "success");
    } catch (e: any) {
      setErr(e.message);
      toast(e.message || "Could not file claim", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mt-6 bg-good/15 text-ink p-5">
        <div className="font-bold uppercase tracking-wide text-sm">Claim filed</div>
        <p className="text-xs mt-2">
          We&rsquo;ll reach out within 24 hours. Your $2,500 damage guarantee covers the full claim.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-6 w-full bg-mist text-ink py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-bad hover:text-bone"
      >
        Report damage
      </button>
    );
  }

  return (
    <div className="mt-6 bg-mist/40 p-5">
      <div className="font-bold uppercase tracking-wide text-sm mb-3">Report damage</div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What happened? (min 10 chars)"
        rows={4}
        className="w-full px-3 py-3 bg-bone border border-mist text-sm"
      />
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Estimated repair cost ($)"
        inputMode="decimal"
        className="w-full px-3 py-3 bg-bone border border-mist text-sm mt-2"
      />
      {err && <div className="text-sm text-bad mt-2">{err}</div>}
      <div className="flex gap-2 mt-3">
        <button
          onClick={submit}
          disabled={submitting || description.length < 10}
          className="flex-1 bg-bad text-bone py-3 text-sm font-bold uppercase tracking-wide disabled:opacity-50"
        >
          {submitting ? "Filing…" : "Submit claim"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-4 bg-mist text-ink py-3 text-sm font-bold uppercase tracking-wide"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

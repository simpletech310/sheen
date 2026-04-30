"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";

const REASONS = [
  { v: "customer_no_show", label: "Customer not on site" },
  { v: "no_water", label: "No water available" },
  { v: "no_power", label: "No power available" },
  { v: "site_unsafe", label: "Site unsafe" },
] as const;

export function IssueFlagButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]["v"]>(REASONS[0].v);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!confirm("Flag this booking? It will be cancelled and the customer charged a fee.")) {
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(`/api/bookings/${jobId}/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, notes: notes.trim() || null }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not flag");
      toast("Issue logged · returning to queue", "success");
      router.push("/pro/queue");
      router.refresh();
    } catch (e: any) {
      toast(e.message || "Could not flag issue", "error");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full bg-bone/10 text-bone py-3 text-xs font-bold uppercase tracking-wide hover:bg-bad transition"
      >
        Flag an issue on site
      </button>
    );
  }

  return (
    <div className="mt-3 bg-bone/5 border border-bone/15 p-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-bone/70 mb-3">
        What happened?
      </div>
      <div className="space-y-2 mb-3">
        {REASONS.map((r) => (
          <button
            key={r.v}
            type="button"
            onClick={() => setReason(r.v)}
            className={`w-full text-left p-3 text-sm transition ${
              reason === r.v ? "bg-bad text-bone" : "bg-white/5 hover:bg-white/10 text-bone"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Detail (optional) — what you saw, how long you waited"
        rows={3}
        maxLength={1000}
        className="w-full px-3 py-2 bg-bone/5 border border-bone/15 text-sm text-bone placeholder:text-bone/40 focus:outline-none focus:border-sol"
      />
      <div className="flex gap-2 mt-3">
        <button
          onClick={submit}
          disabled={busy}
          className="flex-1 bg-bad text-bone py-3 text-xs font-bold uppercase tracking-wide disabled:opacity-50"
        >
          {busy ? "Submitting…" : "Submit & end job"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-4 bg-bone text-ink py-3 text-xs font-bold uppercase tracking-wide"
        >
          Cancel
        </button>
      </div>
      <p className="text-[11px] text-bone/60 mt-2 leading-relaxed">
        We&rsquo;ll cancel the wash and assess the customer the platform fee
        for this issue. Admin reviews every report.
      </p>
    </div>
  );
}

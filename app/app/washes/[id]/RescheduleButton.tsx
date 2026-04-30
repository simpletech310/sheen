"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";

const windows = [
  { label: "Today · 2–4 PM", value: "today_14_16" },
  { label: "Today · 4–6 PM", value: "today_16_18" },
  { label: "Tomorrow · 10 AM–12 PM", value: "tomorrow_10_12" },
  { label: "Tomorrow · 2–4 PM", value: "tomorrow_14_16" },
  { label: "Tomorrow · 4–6 PM", value: "tomorrow_16_18" },
];

export function RescheduleButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [w, setW] = useState(windows[2].value);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const r = await fetch(`/api/bookings/${bookingId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ window: w }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not reschedule");
      toast("Window updated", "success");
      router.refresh();
      setOpen(false);
    } catch (e: any) {
      toast(e.message || "Could not reschedule", "error");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full bg-bone border border-mist text-ink py-3 text-xs font-bold uppercase tracking-wide hover:bg-mist transition"
      >
        Reschedule
      </button>
    );
  }

  return (
    <div className="mt-3 bg-mist/40 p-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-smoke mb-3">
        Pick a new window
      </div>
      <div className="space-y-2 mb-3">
        {windows.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setW(opt.value)}
            className={`w-full text-left p-3 text-sm font-medium ${
              w === opt.value ? "bg-ink text-bone" : "bg-bone hover:bg-mist"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={busy}
          className="flex-1 bg-royal text-bone py-3 text-xs font-bold uppercase tracking-wide disabled:opacity-50 hover:bg-ink"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-4 bg-mist text-ink py-3 text-xs font-bold uppercase tracking-wide"
        >
          Cancel
        </button>
      </div>
      <p className="text-[11px] text-smoke mt-2">
        Reschedule must happen at least 1 hour before the original window.
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";

export function CheckInClient({
  code,
  bookingId,
}: {
  code: string;
  bookingId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      const r = await fetch("/api/bookings/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not check in");
      toast("Pro checked in · timer's running", "success");
      router.push(`/app/tracking/${d.booking_id || bookingId}`);
    } catch (e: any) {
      toast(e.message || "Could not check in", "error");
      setBusy(false);
    }
  }

  return (
    <button
      onClick={confirm}
      disabled={busy}
      className="w-full bg-royal text-bone py-5 text-sm font-bold uppercase tracking-wide hover:bg-ink disabled:opacity-50 transition"
    >
      {busy ? "Confirming…" : "Yes — pro is here, start the timer →"}
    </button>
  );
}

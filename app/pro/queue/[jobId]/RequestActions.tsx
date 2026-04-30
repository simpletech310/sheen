"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";

export function RequestActions({
  jobId,
  expiresAtIso,
}: {
  jobId: string;
  expiresAtIso: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"none" | "accept" | "decline">("none");
  const [now, setNow] = useState(() => Date.now());

  // Live countdown.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const expiresMs = new Date(expiresAtIso).getTime();
  const remaining = Math.max(0, expiresMs - now);
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const expired = remaining === 0;

  async function accept() {
    setBusy("accept");
    try {
      const r = await fetch(`/api/bookings/${jobId}/accept-request`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Could not accept");
      toast("Request accepted", "success");
      router.push(`/pro/jobs/${jobId}/navigate`);
    } catch (e: any) {
      toast(e.message || "Could not accept", "error");
      setBusy("none");
    }
  }

  async function decline() {
    if (!confirm("Decline this request? It will go to the general queue.")) return;
    setBusy("decline");
    try {
      const r = await fetch(`/api/bookings/${jobId}/decline-request`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Could not decline");
      toast("Request declined", "info");
      router.push("/pro/queue");
      router.refresh();
    } catch (e: any) {
      toast(e.message || "Could not decline", "error");
      setBusy("none");
    }
  }

  return (
    <div className="bg-sol/15 border border-sol p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-[10px] uppercase tracking-wider text-sol">
          ● Direct request
        </div>
        <div className="display tabular text-2xl text-sol">
          {expired ? "00:00" : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`}
        </div>
      </div>
      <div className="text-xs text-bone/80 mb-4 leading-relaxed">
        A customer asked for you specifically. Accept and the booking is
        yours. Decline and it goes to the general queue.
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={decline}
          disabled={busy !== "none" || expired}
          className="bg-bone/10 text-bone py-3 text-sm font-bold uppercase tracking-wide hover:bg-bone/20 disabled:opacity-50"
        >
          {busy === "decline" ? "…" : "Decline"}
        </button>
        <button
          onClick={accept}
          disabled={busy !== "none" || expired}
          className="bg-sol text-ink py-3 text-sm font-bold uppercase tracking-wide hover:bg-bone disabled:opacity-50"
        >
          {busy === "accept" ? "…" : expired ? "Expired" : "Accept →"}
        </button>
      </div>
    </div>
  );
}

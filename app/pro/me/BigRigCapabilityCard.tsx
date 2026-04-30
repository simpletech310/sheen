"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";

export function BigRigCapabilityCard({ initialCapable }: { initialCapable: boolean }) {
  const router = useRouter();
  const [capable, setCapable] = useState(initialCapable);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(next: boolean) {
    setBusy(true);
    try {
      const r = await fetch("/api/washers/big-rig-capability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ can_wash_big_rig: next }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || "Could not update");
      }
      setCapable(next);
      setConfirming(false);
      toast(
        next ? "Big-rig jobs are now in your queue" : "Big-rig jobs removed from your queue",
        "success"
      );
      router.refresh();
    } catch (e: any) {
      toast(e.message || "Could not update", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white/5 p-4 mb-3 border-l-2 border-sol">
      <div className="flex justify-between items-start">
        <div className="flex-1 pr-3">
          <div className="font-mono text-[10px] uppercase opacity-60 tracking-wider">
            Big rig service
          </div>
          <div className="text-sm font-bold mt-1">
            {capable ? "You take big-rig jobs" : "Add big-rig jobs to your queue"}
          </div>
          <div className="text-xs text-bone/60 mt-1 leading-relaxed">
            Semi · box · sprinter · RV. Requires long hoses, foam cannon, telescoping brushes,
            ladders, and high-flow pumps. Pays{" "}
            <span className="text-sol font-semibold">2–6×</span> a standard auto job.
          </div>
        </div>
        <span
          className={`shrink-0 font-mono text-[10px] uppercase tracking-wider px-2 py-1 ${
            capable ? "bg-sol text-ink" : "bg-bone/10 text-bone/60"
          }`}
        >
          {capable ? "On" : "Off"}
        </span>
      </div>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          disabled={busy}
          className={`mt-3 w-full py-2.5 text-xs font-bold uppercase tracking-wide transition disabled:opacity-50 ${
            capable
              ? "bg-bone/10 text-bone hover:bg-bad"
              : "bg-sol text-ink hover:bg-bone"
          }`}
        >
          {capable ? "Turn off big-rig jobs" : "I have the equipment — turn on"}
        </button>
      ) : (
        <div className="mt-3 bg-ink/40 p-3">
          <p className="text-[11px] text-bone/80 mb-3 leading-relaxed">
            {capable
              ? "Stop showing big-rig jobs in your queue?"
              : "By turning this on you confirm you own (or can rent) the gear and have washed rigs before. Customer fees on these are higher — so are the standards."}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => save(!capable)}
              disabled={busy}
              className="flex-1 bg-sol text-ink py-2 text-xs font-bold uppercase tracking-wide disabled:opacity-50"
            >
              {busy ? "…" : capable ? "Confirm off" : "Confirm — turn on"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="px-3 bg-bone text-ink py-2 text-xs font-bold uppercase tracking-wide"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

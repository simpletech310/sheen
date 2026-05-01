"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmtUSD } from "@/lib/pricing";
import { toast } from "@/components/ui/Toast";

export function RecurringRow({
  id,
  tier,
  category,
  perVehiclePrice,
  vehicleCount,
  cadence,
  window,
  nextRunAt,
  addressLine,
  paused,
}: {
  id: string;
  tier: string;
  category: string;
  perVehiclePrice: number;
  vehicleCount: number;
  cadence: string;
  window: string;
  nextRunAt: string;
  addressLine: string | null;
  paused: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const total = category === "auto" ? perVehiclePrice * vehicleCount : perVehiclePrice;

  async function patch(updates: { paused?: boolean; active?: boolean }) {
    setBusy(true);
    try {
      const r = await fetch("/api/recurring", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || "Failed");
      }
      toast(
        updates.active === false
          ? "Schedule deleted"
          : updates.paused
          ? "Schedule paused"
          : "Schedule resumed",
        "success"
      );
      router.refresh();
    } catch (e: any) {
      toast(e.message || "Could not update", "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this recurring schedule? Past bookings stay intact.")) return;
    setBusy(true);
    try {
      const r = await fetch("/api/recurring", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || "Failed");
      }
      toast("Schedule deleted", "success");
      router.refresh();
    } catch (e: any) {
      toast(e.message || "Could not delete", "error");
    } finally {
      setBusy(false);
    }
  }

  const next = new Date(nextRunAt);
  const nextLabel = next.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className={`bg-mist/40 p-4 border-l-2 ${paused ? "border-smoke" : "border-royal"}`}>
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-wider text-smoke">
            {cadence}
            {paused && <span className="ml-2 text-bad">· Paused</span>}
          </div>
          <div className="display text-xl mt-1">{tier}</div>
          <div className="text-xs text-smoke mt-1">
            {category === "auto"
              ? `${vehicleCount} vehicle${vehicleCount === 1 ? "" : "s"} · `
              : ""}
            {window.replace(/_/g, " ")}
          </div>
          {addressLine && <div className="text-xs text-smoke">{addressLine}</div>}
          <div className="text-xs text-smoke mt-1">
            Next: <span className="font-mono">{nextLabel}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="display tabular text-lg">{fmtUSD(total)}</div>
          <div className="font-mono text-[10px] uppercase text-smoke">per wash</div>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => patch({ paused: !paused })}
          disabled={busy}
          className="flex-1 bg-bone border border-mist text-ink py-2 text-xs font-bold uppercase tracking-wide disabled:opacity-50 hover:bg-mist"
        >
          {busy ? "…" : paused ? "Resume" : "Pause"}
        </button>
        <button
          onClick={remove}
          disabled={busy}
          className="px-4 bg-mist text-ink py-2 text-xs font-bold uppercase tracking-wide disabled:opacity-50 hover:bg-bad hover:text-bone"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

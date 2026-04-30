"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";

export function PenaltyActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function patch(action: "apply" | "waive" | "dispute") {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/penalties/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      toast(
        action === "apply"
          ? "Penalty applied"
          : action === "waive"
          ? "Penalty waived"
          : "Marked disputed",
        "success"
      );
      router.refresh();
    } catch (e: any) {
      toast(e.message || "Could not update", "error");
    } finally {
      setBusy(false);
    }
  }

  if (status === "applied") {
    return (
      <button
        onClick={() => patch("waive")}
        disabled={busy}
        className="font-mono text-[10px] uppercase tracking-wider text-mist underline disabled:opacity-50"
      >
        {busy ? "…" : "Waive"}
      </button>
    );
  }
  if (status === "waived") {
    return (
      <button
        onClick={() => patch("apply")}
        disabled={busy}
        className="font-mono text-[10px] uppercase tracking-wider text-bad underline disabled:opacity-50"
      >
        {busy ? "…" : "Re-apply"}
      </button>
    );
  }
  return (
    <div className="flex gap-3">
      <button
        onClick={() => patch("apply")}
        disabled={busy}
        className="font-mono text-[10px] uppercase tracking-wider text-bad underline disabled:opacity-50"
      >
        Apply
      </button>
      <button
        onClick={() => patch("waive")}
        disabled={busy}
        className="font-mono text-[10px] uppercase tracking-wider text-smoke underline disabled:opacity-50"
      >
        Waive
      </button>
    </div>
  );
}

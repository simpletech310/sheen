"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";

export function ApproveButton({ userId, status }: { userId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(newStatus: "active" | "pending" | "suspended") {
    setBusy(true);
    const r = await fetch("/api/admin/washer-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, status: newStatus }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      toast(d.error || "Could not update status", "error");
      setBusy(false);
      return;
    }
    toast(
      newStatus === "active"
        ? "Pro activated"
        : newStatus === "suspended"
        ? "Pro suspended"
        : "Status updated",
      "success"
    );
    router.refresh();
    setBusy(false);
  }

  if (status === "active") {
    return (
      <button
        onClick={() => setStatus("suspended")}
        disabled={busy}
        className="text-[10px] text-bad font-bold uppercase tracking-wide"
      >
        Suspend
      </button>
    );
  }
  if (status === "suspended") {
    return (
      <button
        onClick={() => setStatus("active")}
        disabled={busy}
        className="text-[10px] text-good font-bold uppercase tracking-wide"
      >
        Reactivate
      </button>
    );
  }
  return (
    <button
      onClick={() => setStatus("active")}
      disabled={busy}
      className="bg-good text-bone px-3 py-1 text-[10px] font-bold uppercase tracking-wide disabled:opacity-50"
    >
      Approve
    </button>
  );
}

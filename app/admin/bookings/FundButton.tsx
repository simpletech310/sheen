"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FundButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleFund() {
    if (!confirm("Are you sure you want to force payout for this job?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/bookings/${id}/fund`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to fund washer");
      } else {
        alert("Washer funded successfully.");
        router.refresh();
      }
    } catch (_e: any) {
      alert("Error funding washer");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleFund}
      disabled={busy}
      className="px-2 py-1 bg-royal text-bone text-[10px] font-bold uppercase disabled:opacity-50 hover:bg-ink"
    >
      {busy ? "..." : "Fund Washer"}
    </button>
  );
}

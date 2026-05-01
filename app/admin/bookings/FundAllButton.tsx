"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FundAllButton({ count }: { count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleFundAll() {
    if (!confirm(`Are you sure you want to fund ALL ${count} completed jobs? This will trigger live Stripe payouts.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/bookings/fund-all`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to fund all washers");
      } else {
        const data = await res.json();
        alert(`Bulk funding complete. Check the console or logs for details.`);
        console.log("Bulk funding results:", data.results);
        router.refresh();
      }
    } catch (e: any) {
      alert("Error triggering bulk funding");
    } finally {
      setBusy(false);
    }
  }

  if (count === 0) return null;

  return (
    <button
      onClick={handleFundAll}
      disabled={busy}
      className="px-4 py-2 bg-sol text-ink text-xs font-bold uppercase tracking-wider hover:bg-ink hover:text-bone transition disabled:opacity-50"
    >
      {busy ? "Funding all..." : `Fund All Completed (${count})`}
    </button>
  );
}

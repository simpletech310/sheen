"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PartnerClaimButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function claim() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/bookings/${jobId}/claim-as-partner`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      router.push("/partner/dashboard");
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={claim}
        disabled={busy}
        className="w-full bg-ink text-bone py-3 text-sm font-bold uppercase tracking-wide hover:bg-royal disabled:opacity-50"
      >
        {busy ? "Claiming…" : "Claim job"}
      </button>
      {err && <div className="mt-2 text-xs text-bad">{err}</div>}
    </div>
  );
}

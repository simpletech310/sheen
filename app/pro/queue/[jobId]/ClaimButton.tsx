"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClaimButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function claim() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/bookings/${jobId}/claim`, { method: "POST" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Status ${res.status}`);
      }
      router.push(`/pro/jobs/${jobId}/navigate`);
    } catch (e: any) {
      setErr(e.message);
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={claim}
        disabled={loading}
        className="w-full bg-cobalt text-bone rounded-full py-4 text-sm font-semibold disabled:opacity-50"
      >
        {loading ? "Claiming…" : "Claim this job →"}
      </button>
      {err && <div className="text-sm text-bad mt-3 text-center">{err}</div>}
    </>
  );
}

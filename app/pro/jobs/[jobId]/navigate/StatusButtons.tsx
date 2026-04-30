"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StatusButtons({ jobId, mapsUrl }: { jobId: string; mapsUrl: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"none" | "enroute" | "arrived">("none");
  const [err, setErr] = useState<string | null>(null);

  async function startEnRoute() {
    setBusy("enroute");
    setErr(null);
    try {
      await fetch(`/api/bookings/${jobId}/en-route`, { method: "POST" });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      // Open the customer's mapping app regardless.
      window.location.href = mapsUrl;
    }
  }

  async function arrived() {
    setBusy("arrived");
    setErr(null);
    try {
      const r = await fetch(`/api/bookings/${jobId}/arrived`, { method: "POST" });
      if (!r.ok) throw new Error((await r.json()).error || "Failed");
      router.push(`/pro/jobs/${jobId}/checkin`);
    } catch (e: any) {
      setErr(e.message);
      setBusy("none");
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={startEnRoute}
          disabled={busy !== "none"}
          className="bg-bone text-ink py-3 text-sm font-bold uppercase text-center disabled:opacity-50"
        >
          {busy === "enroute" ? "Opening…" : "Open in Maps"}
        </button>
        <button
          onClick={arrived}
          disabled={busy !== "none"}
          className="bg-sol text-ink py-3 text-sm font-bold uppercase text-center hover:bg-bone disabled:opacity-50"
        >
          {busy === "arrived" ? "…" : "I’ve arrived →"}
        </button>
      </div>
      {err && <div className="mt-2 text-xs text-bad">{err}</div>}
    </>
  );
}

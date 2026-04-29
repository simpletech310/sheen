"use client";

import { useState } from "react";
import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";

export default function OnboardPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function startStripe() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/stripe/connect-onboard", { method: "POST" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Status ${res.status}`);
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (e: any) {
      setErr(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="px-5 pt-10 pb-8">
      <Eyebrow className="!text-bone/60" prefix={null}>
        Onboarding
      </Eyebrow>
      <h1 className="display text-3xl mt-3 mb-3">Get jobs. Get paid.</h1>
      <p className="text-sm text-bone/60 mb-7">
        Two-minute Stripe Connect Express setup, then upload $1M GL. Verified within 24 hours.
      </p>

      <ol className="space-y-4 mb-8">
        <li className="bg-white/5 p-4 flex justify-between items-center">
          <div>
            <div className="font-mono text-[10px] uppercase opacity-60">Step 01</div>
            <div className="text-sm font-semibold mt-1">Stripe Connect Express</div>
            <div className="text-xs text-bone/50 mt-1">Bank or debit card for instant payouts</div>
          </div>
          <button
            onClick={startStripe}
            disabled={loading}
            className="bg-cobalt text-bone rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-50"
          >
            {loading ? "…" : "Start →"}
          </button>
        </li>
        <li className="bg-white/5 p-4">
          <div className="font-mono text-[10px] uppercase opacity-60">Step 02</div>
          <div className="text-sm font-semibold mt-1">Upload insurance</div>
          <div className="text-xs text-bone/50 mt-1">$1M GL minimum · PDF or photo</div>
        </li>
        <li className="bg-white/5 p-4">
          <div className="font-mono text-[10px] uppercase opacity-60">Step 03</div>
          <div className="text-sm font-semibold mt-1">Background check</div>
          <div className="text-xs text-bone/50 mt-1">Checkr · 24–48 hours</div>
        </li>
      </ol>

      {err && <div className="text-sm text-bad">{err}</div>}

      <Link href="/pro/queue" className="block text-center text-xs text-bone/60 underline">
        Skip for now
      </Link>
    </div>
  );
}

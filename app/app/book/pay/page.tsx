"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { computeFees } from "@/lib/stripe/fees";
import { fmtUSD } from "@/lib/pricing";

function PayInner() {
  const router = useRouter();
  const params = useSearchParams();
  const tier = params.get("tier") ?? "Premium Detail";
  const price = Number(params.get("price") ?? "18500");
  const fees = computeFees({ serviceCents: price, routedTo: "solo_washer" });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const street = params.get("street") ?? "";
  const city = params.get("city") ?? "";
  const state = params.get("state") ?? "";
  const zip = params.get("zip") ?? "";
  const notes = params.get("notes") ?? "";
  const win = params.get("window") ?? "tomorrow_10_12";

  async function submit() {
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier_name: tier,
          service_cents: price,
          address: { street, city, state, zip, notes },
          window: win,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Status ${res.status}`);
      }
      const data = await res.json();
      router.push(`/app/tracking/${data.booking_id}`);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/book/address" className="text-smoke text-sm">
          ← Back
        </Link>
      </div>
      <Eyebrow>Step 3 / 3 · Pay &amp; confirm</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-6">Confirm &amp; pay</h1>

      <div className="bg-mist/40 p-5 mb-5">
        <div className="text-sm font-semibold mb-1">{tier}</div>
        <div className="text-xs text-smoke">
          {street}, {city}, {state} {zip}
        </div>
        <div className="text-xs text-smoke mt-1">{win.replace(/_/g, " ")}</div>
      </div>

      <div className="space-y-2.5 text-sm">
        <div className="flex justify-between">
          <span className="text-smoke">{tier}</span>
          <span className="tabular">{fmtUSD(fees.serviceCents)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-smoke">Trust fee (10%)</span>
          <span className="tabular">{fmtUSD(fees.trustFee)}</span>
        </div>
        <div className="flex justify-between text-xs text-smoke">
          <span>Tip — added after wash</span>
          <span>—</span>
        </div>
        <div className="flex justify-between pt-3 border-t border-mist">
          <span className="font-semibold">Total today</span>
          <span className="display tabular text-2xl">{fmtUSD(fees.customerCharge)}</span>
        </div>
      </div>

      <div className="mt-6 bg-mist/40 p-4 text-xs text-smoke leading-relaxed">
        Apple Pay / card on next screen via Stripe. Funds held until your pro marks the job complete; tip added on the
        rate screen, 100% to your pro.
      </div>

      {err && <div className="mt-4 text-sm text-bad">{err}</div>}

      <button
        onClick={submit}
        disabled={submitting}
        className="mt-6 w-full bg-cobalt text-bone rounded-full py-4 text-sm font-semibold disabled:opacity-50"
      >
        {submitting ? "Booking…" : `Confirm — pay ${fmtUSD(fees.customerCharge)} →`}
      </button>
      <p className="text-[11px] text-smoke text-center mt-3">$2,500 damage guarantee · vetted local pros</p>
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense>
      <PayInner />
    </Suspense>
  );
}

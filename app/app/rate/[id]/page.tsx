"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { toast } from "@/components/ui/Toast";
import { StripePaymentElement } from "@/components/customer/StripePaymentElement";
import { fmtUSD } from "@/lib/pricing";

const tips = [
  { pct: 18, label: "18%" },
  { pct: 22, label: "22%" },
  { pct: 25, label: "25%" },
];

function RateInner({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [stars, setStars] = useState(5);
  const [tipPct, setTipPct] = useState(22);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const tipCents = booking ? Math.round((booking.service_cents * tipPct) / 100) : 0;

  useEffect(() => {
    fetch(`/api/bookings/${id}`)
      .then(r => r.json())
      .then(d => {
        setBooking(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (tipCents > 0) {
      setClientSecret(null);
      fetch("/api/stripe/checkout-tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: id, amount_cents: tipCents }),
      })
        .then(r => r.json())
        .then(d => {
          if (d.client_secret) setClientSecret(d.client_secret);
        })
        .catch(() => {});
    } else {
      setClientSecret(null);
    }
  }, [id, tipCents]);

  async function submit() {
    setSubmitting(true);
    try {
      const r = await fetch(`/api/bookings/${id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars, tip_pct: tipPct, comment }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || "Could not submit rating");
      }
      toast(
        tipPct > 0 ? "Rating + tip sent · thanks!" : "Rating sent · thanks!",
        "success"
      );
      router.push("/app/washes");
    } catch (e: any) {
      toast(e.message || "Could not submit rating", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-10 text-center text-smoke">Loading…</div>;
  if (!booking) return <div className="p-10 text-center text-bad">Booking not found</div>;

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/app/tracking/${id}`} className="text-smoke text-sm">
          ← Back
        </Link>
      </div>
      <Eyebrow>Rate your wash</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-6">How&rsquo;d we do?</h1>

      <div className="flex gap-2 mb-7">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setStars(n)}
            className={`text-4xl ${n <= stars ? "text-cobalt" : "text-mist"}`}
            aria-label={`${n} stars`}
          >
            ★
          </button>
        ))}
      </div>

      <Eyebrow>Add a tip · 100% to your pro</Eyebrow>
      <div className="grid grid-cols-4 gap-2 mt-3 mb-6">
        {tips.map((t) => (
          <button
            key={t.pct}
            onClick={() => setTipPct(t.pct)}
            className={`p-3 text-sm font-bold uppercase tracking-wide ${tipPct === t.pct ? "bg-ink text-bone" : "bg-mist/50"}`}
          >
            {t.label}
          </button>
        ))}
        <button onClick={() => setTipPct(0)} className={`p-3 text-sm font-bold uppercase tracking-wide ${tipPct === 0 ? "bg-ink text-bone" : "bg-mist/50"}`}>
          Skip
        </button>
      </div>

      {tipCents > 0 && (
        <div className="mb-6 bg-mist/20 p-5 border border-mist rounded-none">
          <div className="font-mono text-[10px] uppercase tracking-wider text-smoke mb-3">Secure Tip Payment · {fmtUSD(tipCents)}</div>
          {clientSecret ? (
            <StripePaymentElement
              clientSecret={clientSecret}
              amountLabel={fmtUSD(tipCents)}
              onSuccess={submit}
            />
          ) : (
            <div className="py-4 text-center text-xs text-smoke">Setting up payment…</div>
          )}
        </div>
      )}

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Anything to say? (optional)"
        rows={3}
        className="w-full px-4 py-3 bg-bone border border-mist rounded-none text-sm mb-6"
      />

      {tipPct === 0 && (
        <button
          onClick={submit}
          disabled={submitting}
          className="w-full bg-cobalt text-bone rounded-none py-4 text-sm font-bold uppercase tracking-wide disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit Rating →"}
        </button>
      )}
    </div>
  );
}

export default function RatePage({ params }: { params: { id: string } }) {
  return (
    <Suspense>
      <RateInner params={params} />
    </Suspense>
  );
}

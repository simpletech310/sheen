"use client";

import { useState } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;
function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
}

function PayInner({
  amountLabel,
  onSuccess,
}: {
  amountLabel: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    setSubmitting(false);
    if (error) {
      setError(error.message ?? "Something went wrong");
      return;
    }
    if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
      onSuccess();
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <PaymentElement options={{ layout: "accordion" }} />
      {error && <div className="text-sm text-bad">{error}</div>}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full bg-royal text-bone py-4 text-sm font-bold uppercase tracking-wide disabled:opacity-50 hover:bg-ink"
      >
        {submitting ? "Processing…" : `Pay ${amountLabel}`}
      </button>
    </form>
  );
}

export function StripePaymentElement({
  clientSecret,
  amountLabel,
  onSuccess,
}: {
  clientSecret: string;
  amountLabel: string;
  onSuccess: () => void;
}) {
  return (
    <Elements
      stripe={getStripe()}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#003594",
            colorText: "#0A0A0A",
            colorBackground: "#FAFAF7",
            borderRadius: "0",
            fontFamily: "Inter, system-ui, sans-serif",
          },
        },
      }}
    >
      <PayInner amountLabel={amountLabel} onSuccess={onSuccess} />
    </Elements>
  );
}

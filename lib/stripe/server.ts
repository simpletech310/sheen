import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to .env.local locally or to the Vercel project env."
    );
  }
  _stripe = new Stripe(key);
  return _stripe;
}

// Backwards-compatible default export for any existing imports of `stripe`.
// IMPORTANT: do NOT use this at module top-level. Always call inside a request handler.
export const stripe = new Proxy({} as Stripe, {
  get(_t, prop) {
    return (getStripe() as any)[prop];
  },
});


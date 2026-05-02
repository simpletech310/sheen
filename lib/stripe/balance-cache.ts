// In-process cache for Stripe.balance.retrieve(). The wallet UI polls this
// on every render — a 30s TTL collapses bursts without making a fresh
// instant-payout look stale (the instant route invalidates the cache after
// a successful payout). Process-local because each Vercel invocation
// already serves a single user's wallet for a few seconds at a time;
// shared cache (Redis) would be overkill.

const TTL_MS = 30_000;

type Entry = {
  value: {
    available_cents: number;
    pending_cents: number;
    instant_available_cents: number;
  };
  expires: number;
};

const store = new Map<string, Entry>();

export function getCachedBalance(stripeAccountId: string): Entry["value"] | null {
  const e = store.get(stripeAccountId);
  if (!e) return null;
  if (e.expires <= Date.now()) {
    store.delete(stripeAccountId);
    return null;
  }
  return e.value;
}

export function setCachedBalance(stripeAccountId: string, value: Entry["value"]) {
  store.set(stripeAccountId, { value, expires: Date.now() + TTL_MS });
}

export function invalidateBalance(stripeAccountId: string) {
  store.delete(stripeAccountId);
}

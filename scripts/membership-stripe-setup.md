# Membership Stripe setup

Migration `0025_membership_promo_pricing.sql` adds the columns
(`stripe_price_id_promo`, `stripe_price_id_standard`, etc.) and the
matching `setup-membership-stripe.mjs` script provisions the actual
Stripe products + prices and writes the IDs into Supabase.

## One-time setup

```bash
# 1. Apply the migrations (0024 + 0025 if not already)
supabase db push   # or psql -f supabase/migrations/0025_*.sql

# 2. Provision Stripe + write IDs back to the DB
node scripts/setup-membership-stripe.mjs
```

The script is **idempotent** — it uses Stripe `lookup_key` to find existing
products/prices, so re-running it never duplicates. Reads
`STRIPE_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`.

What it creates per tier:

| Plan         | Promo Price | Standard Price |
| ------------ | ----------- | -------------- |
| Sheen+ Basic | $39 / mo    | $49 / mo       |
| Sheen+ Pro   | $79 / mo    | $99 / mo       |

## What the code does after that

`POST /api/stripe/subscriptions` picks the price by this rule, in order:

1. **Promo Price** if (a) `promo_until > now()` and (b) `stripe_price_id_promo`
   is set. Stamps `is_promo_locked = true` on the membership row.
2. **Standard Price** if `stripe_price_id_standard` is set.
3. **Legacy Price** (`stripe_price_id`) — only used if neither of the above
   exist, so a half-set-up environment still works for one tier while the
   other is being provisioned.

## Existing $59 / $129 subscribers

**They keep their current price.** Stripe bills the subscription against
the Price it was created against, regardless of what's in our DB. The
membership row's `price_tier` reads `null` for these accounts (legacy) —
surface that in admin if you ever want to mass-migrate them.

To migrate one manually:

```ts
await stripe.subscriptions.update(subscriptionId, {
  items: [{ id: itemId, price: newPriceId }],
  proration_behavior: "none",
});
```

## Ending the promo

```sql
update public.membership_plans
  set promo_until = now()
  where tier in ('basic', 'pro');
```

`promo_until` is the only switch — promo-locked memberships keep their rate
forever; new signups silently fall to the standard Price.

## Rotating amounts

Stripe Prices are immutable. To change the promo amount from $39 → $35
(say), bump the `lookup_key` in `setup-membership-stripe.mjs` to `_v2` and
re-run. The script creates the new Price, writes its ID to Supabase, and
the old `_v1` Price stays alive for grandfathered subscribers.

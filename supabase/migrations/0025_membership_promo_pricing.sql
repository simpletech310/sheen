-- =============================================================
-- Sheen+ membership promo pricing.
--
-- Adds a parallel set of columns so we can run the launch promo
-- ($39 Basic / $79 Pro) alongside the standard rate ($49 / $99)
-- without breaking grandfathered subscribers on the original
-- $59 / $129 prices.
--
-- Migration plan for active subscribers:
--   - Existing $59/$129 subscribers stay grandfathered. The
--     `stripe_price_id` on the membership_plans row no longer
--     drives their charge — Stripe still bills them on the
--     Price they were created against. Don't touch them.
--   - New signups during the promo window get `stripe_price_id_promo`
--     and we stamp `is_promo_locked = true` on their membership row.
--   - When the promo ends (`promo_until`), `subscriptions.create`
--     stops handing out promo prices. Existing promo-locked
--     subscribers stay on the promo Price ID indefinitely
--     (Founder-Lock for membership).
--
-- Stripe Price IDs themselves must be created manually in the
-- Stripe dashboard — see the README at the bottom of this file.
-- =============================================================

alter table public.membership_plans
  add column if not exists promo_price_cents int,
  add column if not exists standard_price_cents int,
  add column if not exists stripe_price_id_promo text,
  add column if not exists stripe_price_id_standard text,
  add column if not exists promo_until timestamptz;

-- Default standard equals current monthly_price_cents for any plan we
-- don't explicitly reprice.
update public.membership_plans
  set standard_price_cents = monthly_price_cents
  where standard_price_cents is null;

-- Promo + standard prices from the launch playbook.
update public.membership_plans
  set promo_price_cents = 3900,
      standard_price_cents = 4900,
      monthly_price_cents = 3900,    -- new signups see promo as the headline
      description = '4 Express OR 2 Full Detail per month. Priority booking. 2× points.'
  where tier = 'basic';

update public.membership_plans
  set promo_price_cents = 7900,
      standard_price_cents = 9900,
      monthly_price_cents = 7900,
      description = '4 Full Detail + 1 Premium per month. Priority booking. 3× points. Free Big Rig quarterly.'
  where tier = 'pro';

-- Elite stays at its current price for now — covered by Sheen+ Combined later.

-- 90-day launch window. Update if you ship promo for longer.
update public.membership_plans
  set promo_until = (now() + interval '90 days')
  where tier in ('basic', 'pro') and promo_until is null;

-- Track which price tier a subscription was created on so renewals + the
-- "you were grandfathered at $X" UI line up. Stripe is the source of
-- truth on the actual charge — this is just for display + analytics.
alter table public.memberships
  add column if not exists is_promo_locked boolean not null default false,
  add column if not exists price_tier text check (price_tier in ('promo','standard','grandfathered'));

-- =============================================================
-- MANUAL STRIPE SETUP (run once, before this migration takes effect):
--
-- 1. In Stripe Dashboard → Products, create or update "Sheen+ Basic"
--    with two prices:
--      - $39/mo recurring → copy Price ID into stripe_price_id_promo
--      - $49/mo recurring → copy Price ID into stripe_price_id_standard
-- 2. Same for "Sheen+ Pro" at $79 promo / $99 standard.
-- 3. Run this UPDATE manually with the IDs:
--      update public.membership_plans
--        set stripe_price_id_promo    = 'price_XXX',
--            stripe_price_id_standard = 'price_YYY'
--        where tier = 'basic';
--      update public.membership_plans
--        set stripe_price_id_promo    = 'price_AAA',
--            stripe_price_id_standard = 'price_BBB'
--        where tier = 'pro';
-- 4. Existing $59/$129 subscribers keep charging at their current
--    Stripe Price (no migration code touches them).
-- =============================================================

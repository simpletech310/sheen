-- =============================================================
-- Big Rig seed data.
-- Splits from 0012 because Postgres won't allow using a new enum
-- value in the same transaction it was added in.
-- =============================================================

-- 1. Service tiers. Pricing reflects time + equipment + larger
--    surface area. Mirrors the AUTO_TIERS shape in lib/pricing.ts.
insert into public.services (category, tier_name, base_price_cents, duration_minutes, description, included, sort_order)
values
  ('big_rig', 'Rig Rinse', 14500, 90,
    'Hand wash for the cab + trailer/box. Foam, rinse, wheels, mud flaps.',
    array['Foam wash', 'Cab + trailer rinse', 'Wheels & flaps', 'Windows'],
    50),
  ('big_rig', 'Trailer Wash', 28500, 180,
    'Full exterior with chrome polish, dressing on tires, fender details.',
    array['Everything in Rinse', 'Chrome polish', 'Tire dressing', 'Fender detail'],
    60),
  ('big_rig', 'Full Rig Detail', 58500, 300,
    'Exterior + cab interior. Vacuum, wipe-down, leather conditioning, glass.',
    array['Everything in Trailer Wash', 'Cab interior detail', 'Leather conditioning', 'Sleeper vacuum'],
    70),
  ('big_rig', 'Showroom Rig', 95000, 480,
    'Premium with paint correction on cab + trailer, ceramic top-up.',
    array['Everything in Full Rig', 'Paint correction', 'Ceramic top-up', '8 hours'],
    80)
on conflict do nothing;

-- 2. Membership plans for big-rig customers + a combined plan that covers
--    auto and big_rig. Stripe price IDs left null — wired by admin sync.
--    The Subscribe button stays disabled in /app/membership until the
--    stripe_price_id is filled in.
insert into public.membership_plans (
  tier, display_name, monthly_price_cents, included_washes, max_service_tier,
  sort_order, description, service_categories, allowed_tier_names
) values
  ('basic', 'Rig Solo', 19900, 1, 'full', 10,
    '1 Trailer Wash per month. For owner-operators who want the rig sharp every month.',
    array['big_rig'],
    array['Rig Rinse', 'Trailer Wash']),
  ('pro',   'Rig Pro',  34900, 2, 'premium', 11,
    '2 washes per month up to Full Rig Detail. Most popular for fleets of one.',
    array['big_rig'],
    array['Rig Rinse', 'Trailer Wash', 'Full Rig Detail']),
  ('pro',   'Sheen+ Combined', 19900, 2, 'premium', 12,
    '1 auto Premium Detail + 1 big-rig Trailer Wash per month. For drivers + their daily.',
    array['auto','big_rig'],
    array['Express Wash', 'Full Detail', 'Premium Detail', 'Trailer Wash'])
on conflict do nothing;

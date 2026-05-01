-- =============================================================
-- Launch promo pricing — undercut MobileWash / Washos / Spiffy
-- by 15-25% during the 90-day promo, with the standard price
-- displayed as the anchor on marketing pages.
--
-- For now `base_price_cents` IS the promo price (everyone pays
-- it during launch). We track the "what it'll be" via a separate
-- `standard_price_cents` column so the marketing pages can show
-- the strikethrough anchor and the value created by the promo.
--
-- Founder-Lock (per-customer monthly evaluation) is a separate
-- piece of work — this migration just sets the menu.
-- =============================================================

alter table public.services
  add column if not exists standard_price_cents int;

-- Default: standard equals current base so any service we don't
-- explicitly reprice still renders sensibly.
update public.services
  set standard_price_cents = base_price_cents
  where standard_price_cents is null;

-- ---------- AUTO ----------
update public.services set base_price_cents =  2400, standard_price_cents =  2900, duration_minutes =  30 where category = 'auto' and tier_name = 'Express Wash';
update public.services set base_price_cents =  4900, standard_price_cents =  5900, duration_minutes =  60 where category = 'auto' and tier_name = 'Full Detail';
update public.services set base_price_cents =  8900, standard_price_cents = 10900, duration_minutes =  90 where category = 'auto' and tier_name = 'Premium Detail';
update public.services set base_price_cents = 15900, standard_price_cents = 18900, duration_minutes = 180 where category = 'auto' and tier_name = 'Showroom';

-- ---------- HOME ----------
update public.services set base_price_cents = 12900, standard_price_cents = 15900, duration_minutes =  90 where category = 'home' and tier_name = 'Driveway & Walkway';
update public.services set base_price_cents =  7900, standard_price_cents =  9500, duration_minutes =  60 where category = 'home' and tier_name = 'Deck or Patio';
update public.services set base_price_cents = 24900, standard_price_cents = 29900, duration_minutes = 240 where category = 'home' and tier_name = 'Full Exterior';
-- Solar moves from per-panel to a single small-system price so the
-- customer-facing line item is legible. Pros can still negotiate larger
-- arrays via /pro/help.
update public.services set base_price_cents =  9900, standard_price_cents = 12900, duration_minutes =  60 where category = 'home' and tier_name = 'Solar Panel Wash';

-- ---------- BIG RIG ----------
update public.services set base_price_cents = 11500, standard_price_cents = 13500, duration_minutes =  90 where category = 'big_rig' and tier_name = 'Rig Rinse';
update public.services set base_price_cents = 21500, standard_price_cents = 24500, duration_minutes = 180 where category = 'big_rig' and tier_name = 'Trailer Wash';
update public.services set base_price_cents = 39900, standard_price_cents = 49900, duration_minutes = 300 where category = 'big_rig' and tier_name = 'Full Rig Detail';
update public.services set base_price_cents = 64900, standard_price_cents = 79900, duration_minutes = 480 where category = 'big_rig' and tier_name = 'Showroom Rig';

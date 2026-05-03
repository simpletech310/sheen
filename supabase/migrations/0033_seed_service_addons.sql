-- =============================================================
-- Seed the service_addons catalog (auto + big-rig).
--
-- All washer_payout_cents are computed at solo-washer split:
--   payout = round(price * 0.78)            -- 22% commission
-- The remaining ~32% to Sheen comes from the 22% commission +
-- 10% trust fee added on top of price at checkout.
--
-- Pricing rationale:
--   - Quick add-ons ($19-$99): washer takes ~$15-$77, fast turnover
--   - Premium ($129-$399): washer takes ~$100-$311, longer jobs
--   - size_multiplier_applies = true for jobs that scale with
--     vehicle surface area (ceramic, shampoo, paint correction,
--     ozone). Tire shine + pet hair stay flat.
--
-- Window tint deferred to v2 — per-state VLT regulation +
-- installer licensing exposure warrant a separate flow.
--
-- Idempotent — codes are unique, ON CONFLICT DO NOTHING.
-- =============================================================

-- ---------- AUTO add-ons ----------
insert into public.service_addons
  (code, category, name, short_desc, base_price_cents, washer_payout_cents,
   duration_minutes, required_capability, required_tier,
   compatible_tiers, size_multiplier_applies, sort_order)
values
  -- Rookie-tier (anyone with the capability flag)
  ('tire_shine_plus', 'auto',
   'Premium tire dressing',
   'Long-lasting gel dressing — wet-look tires for 2+ weeks.',
   1900, 1482, 10,
   'tire_shine_plus', 'rookie', null, false, 10),

  ('pet_hair', 'auto',
   'Pet hair extraction',
   'Rubber-brush + extractor pass on seats & carpet. Goodbye fur.',
   3900, 3042, 25,
   'pet_hair', 'rookie', null, false, 20),

  ('hand_wax', 'auto',
   'Hand wax (carnauba)',
   'Premium carnauba wax, hand-applied. 2-3 month gloss + protection.',
   5900, 4602, 30,
   'hand_wax', 'rookie',
   array['Express Wash', 'Full Detail'], false, 30),

  ('bug_tar_removal', 'auto',
   'Bug & tar removal',
   'Front-end deep clean — bumper, grille, mirrors. Safe on clear coat.',
   4900, 3822, 25,
   'bug_tar_removal', 'rookie', null, false, 40),

  -- Pro-tier (10+ jobs, 4.5+ rating)
  ('leather_treatment', 'auto',
   'Leather clean + condition',
   'Deep clean + UV-protective conditioner on all leather surfaces.',
   4900, 3822, 30,
   'leather_treatment', 'pro', null, false, 50),

  ('engine_bay', 'auto',
   'Engine bay degrease + dress',
   'Degrease, rinse, low-pressure detail. Plastics dressed, not greasy.',
   5900, 4602, 30,
   'engine_bay', 'pro', null, false, 60),

  ('clay_bar', 'auto',
   'Clay-bar decontamination',
   'Removes embedded contaminants paint wash can''t touch. Glass-smooth finish.',
   6900, 5382, 40,
   'clay_bar', 'pro',
   array['Express Wash', 'Full Detail'], false, 70),

  ('headlight_restore', 'auto',
   'Headlight restoration',
   'Sand, polish, seal both headlights. Foggy to crystal clear.',
   8900, 6942, 45,
   'headlight_restore', 'pro', null, false, 80),

  ('interior_shampoo', 'auto',
   'Carpet & upholstery shampoo',
   'Hot-water extraction on carpets, mats, cloth seats. Stains lifted.',
   7900, 6162, 45,
   'interior_shampoo', 'pro', null, true, 90),

  ('ozone_treatment', 'auto',
   'Ozone odor treatment',
   '60-minute ozone cycle eliminates smoke, pet, food odors at the source.',
   7900, 6162, 60,
   'ozone_treatment', 'pro', null, true, 100),

  -- Elite-tier (50+ jobs, 4.7+ rating)
  ('ceramic_seal', 'auto',
   '6-month ceramic spray seal',
   'SiO2 spray sealant — 6 months of beading + UV protection.',
   12900, 10062, 45,
   'ceramic_seal', 'elite',
   array['Express Wash', 'Full Detail', 'Premium Detail'], true, 110),

  ('paint_correction', 'auto',
   '1-step paint correction',
   'Compound + polish removes swirls, light scratches. Paint reset.',
   24900, 19422, 120,
   'paint_correction', 'elite',
   array['Express Wash', 'Full Detail', 'Premium Detail'], true, 120),

  -- Legend-tier (150+ jobs, 4.8+ rating)
  ('ceramic_pro', 'auto',
   '2-year ceramic coating',
   'Pro-grade ceramic coating, 2-year warranty. Ultimate gloss + protection.',
   39900, 31122, 180,
   'ceramic_pro', 'legend', null, true, 130)
on conflict (code) do nothing;


-- ---------- BIG-RIG add-ons ----------
insert into public.service_addons
  (code, category, name, short_desc, base_price_cents, washer_payout_cents,
   duration_minutes, required_capability, required_tier,
   compatible_tiers, size_multiplier_applies, sort_order)
values
  -- Rookie-tier
  ('bug_tar_rig', 'big_rig',
   'Front-end bug & tar removal',
   'Cab front, grille, bumpers. Highway grime stripped.',
   7900, 6162, 30,
   'bug_tar_rig', 'rookie', null, false, 10),

  -- Pro-tier
  ('degrease_undercarriage', 'big_rig',
   'Undercarriage degrease',
   'High-pressure degrease — frame, tanks, fifth wheel. Extends component life.',
   9900, 7722, 45,
   'degrease_undercarriage', 'pro', null, false, 20),

  ('cab_shampoo', 'big_rig',
   'Cab carpet shampoo',
   'Hot-water extraction on cab carpets, floor mats, cloth seats.',
   12900, 10062, 60,
   'cab_shampoo', 'pro', null, false, 30),

  -- Elite-tier
  ('aluminum_wheel_polish', 'big_rig',
   'Aluminum wheel polish',
   'Cut, polish, seal aluminum wheels. Mirror finish, all axles.',
   14900, 11622, 90,
   'aluminum_wheel_polish', 'elite', null, false, 40),

  ('sleeper_deep_clean', 'big_rig',
   'Sleeper deep-clean',
   'Bedding-out, full vacuum, surfaces wiped, ozone optional. Reset for the road.',
   17900, 13962, 90,
   'sleeper_deep_clean', 'elite', null, false, 50),

  ('chrome_polish_premium', 'big_rig',
   'Premium chrome polish',
   'Acid wash + cut + polish + seal on stacks, tanks, bumpers. Show-truck shine.',
   19900, 15522, 120,
   'chrome_polish_premium', 'elite',
   array['Rig Rinse', 'Trailer Wash', 'Full Rig Detail'], false, 60),

  ('ceramic_seal_rig', 'big_rig',
   'Ceramic spray seal (cab + trailer)',
   'SiO2 sealant on cab + trailer panels. Hydrophobic finish, easier washes.',
   29900, 23322, 90,
   'ceramic_seal_rig', 'elite',
   array['Rig Rinse', 'Trailer Wash', 'Full Rig Detail'], false, 70)
on conflict (code) do nothing;

-- Service catalog (PDF §3)
insert into public.services (category, tier_name, base_price_cents, duration_minutes, requires_partner, description, included, sort_order) values
  ('auto', 'Express Wash', 3500, 30, false, 'Hand wash, tire shine, windows', array['Hand wash','Tire shine','Windows'], 1),
  ('auto', 'Full Detail', 8500, 75, false, 'Express + interior vac, dash wipe, mats', array['Hand wash','Tire shine','Windows','Interior vacuum','Dash wipe','Floor mats'], 2),
  ('auto', 'Premium Detail', 18500, 150, false, 'Full + clay bar, wax, leather conditioning', array['Everything in Full','Clay bar treatment','Hand wax','Leather conditioning','Two-bucket method'], 3),
  ('auto', 'Showroom', 45000, 300, false, 'Premium + paint correction, ceramic top-up', array['Everything in Premium','Paint correction','Ceramic top-up','5–7 hours'], 4),
  ('home', 'Driveway & Walkway', 18500, 90, false, 'Up to 800 sq ft', array['Pre-treatment','Power wash','Spot treatment'], 5),
  ('home', 'Full Exterior', 38500, 240, false, 'House siding + drive + walks', array['Siding','Driveway','Walkways'], 6),
  ('home', 'Deck/Patio Add-on', 9500, 60, false, 'Deck or patio cleaning', array['Power wash','Stain prep'], 7),
  ('home', 'Solar Panel Wash', 1200, 5, false, 'Per panel', array['Per panel cleaning'], 8),
  ('commercial', 'Commercial Quote', 0, 0, true, 'Storefronts, lots, fleet, post-construction — quoted', array['Site visit','Custom quote'], 9)
on conflict do nothing;

-- Demo partner profiles (no auth user — these are public marketing surfaces only)
-- We create three placeholder auth-less rows by allocating fake UUIDs that
-- nobody can sign in as. Marketing pages read partner_profiles publicly.
do $$
declare
  uid_lefty uuid := '11111111-1111-1111-1111-111111111111';
  uid_pacific uuid := '22222222-2222-2222-2222-222222222222';
  uid_westside uuid := '33333333-3333-3333-3333-333333333333';
begin
  -- Insert auth.users stubs only if missing (using on conflict) — these are display-only
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous)
  values
    (uid_lefty, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo+lefty@sheen.local', crypt('disabled-' || uid_lefty::text, gen_salt('bf')), now(), now(), now(), '{}'::jsonb, '{}'::jsonb, false, false),
    (uid_pacific, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo+pacific@sheen.local', crypt('disabled-' || uid_pacific::text, gen_salt('bf')), now(), now(), now(), '{}'::jsonb, '{}'::jsonb, false, false),
    (uid_westside, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo+westside@sheen.local', crypt('disabled-' || uid_westside::text, gen_salt('bf')), now(), now(), now(), '{}'::jsonb, '{}'::jsonb, false, false)
  on conflict (id) do nothing;

  insert into public.users (id, role, email, full_name) values
    (uid_lefty, 'partner_owner', 'demo+lefty@sheen.local', 'Lefty Detail Co.'),
    (uid_pacific, 'partner_owner', 'demo+pacific@sheen.local', 'Pacific Power Wash'),
    (uid_westside, 'partner_owner', 'demo+westside@sheen.local', 'Westside Auto Spa')
  on conflict (id) do nothing;

  insert into public.partner_profiles (user_id, business_name, slug, tagline, capabilities, service_areas, is_founding, rating_avg, jobs_completed, status, years_in_business)
  values
    (uid_lefty, 'Lefty Detail Co.', 'lefty-detail', 'Showroom-grade detail since 2018', array['Ceramic coating','Paint correction','Leather','Premium detail'], array['Beverly Hills','Bel Air','Pasadena'], true, 4.98, 1840, 'active', 8),
    (uid_pacific, 'Pacific Power Wash', 'pacific-power', 'Driveways, siding, decks. Soft-wash certified.', array['Power wash','Soft wash','Solar panels'], array['Manhattan Beach','El Segundo','Hermosa Beach'], false, 4.92, 612, 'active', 5),
    (uid_westside, 'Westside Auto Spa', 'westside-auto', 'Westside auto detail, no-contact pickup option.', array['Auto detail','Interior','Pet hair removal'], array['Santa Monica','West LA','Culver City'], false, 4.86, 980, 'active', 6)
  on conflict (slug) do nothing;
end $$;

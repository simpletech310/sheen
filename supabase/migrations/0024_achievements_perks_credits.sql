-- =============================================================
-- Achievements expansion + reward plumbing
--
-- Adds the 10 achievements from the launch playbook on top of the
-- existing v1 catalog. We don't drop the older entries (existing
-- unlocks would orphan); the new ids live alongside.
--
-- Three new tables:
--   customer_perks        — flat per-user grants (discount %, weekend
--                           priority, founder flag). One row per user,
--                           upserted as achievements unlock.
--   customer_credits      — one-shot freebies (e.g. Squad Captain's
--                           free Showroom). Issued by achievements,
--                           consumed at checkout.
--
-- Plus two columns the new evaluators need:
--   reviews.has_photo     — for Sheen Star (25 reviews with photos)
--   vehicles.vehicle_class — for Hot Wheels (5 different types)
-- =============================================================

-- ---------- new achievement catalog rows ----------
-- ids are stable slugs; bonus_points is the points reward only — non-points
-- rewards (discount %, free wash credits) live in customer_perks/credits
-- and are granted by the evaluator.
insert into public.achievements (id, display_name, description, icon, bonus_points, sort_order) values
  ('welcome_wash',     'Welcome Wash',    'First booking on the platform.',                      '★',  100, 11),
  ('loyal_local',      'Loyal Local',     '10 washes in 90 days. Free Express upgrade for life.', '🪩', 0,   12),
  ('squad_captain',    'Squad Captain',   '5 friends signed up. Free Showroom Detail credit.',   '🤝', 0,   13),
  ('block_boss',       'Block Boss',      '5 neighbours booked within 30 days. 1 yr Sheen+ Basic free.', '🏘', 0, 14),
  ('founder',          'Founder',         'Among the first 100 customers in your market. Founder badge + 5% off forever.', '🎖', 0, 15),
  ('ride_or_die',      'Ride or Die',     '12 months continuous Sheen+. Annual free Showroom + 5% off forever.', '💎', 0, 16),
  ('hot_wheels',       'Hot Wheels',      '5 different vehicle types washed.',                   '🏎', 200, 17),
  ('weekend_warrior',  'Weekend Warrior', '10 weekend bookings. Permanent weekend priority.',    '🌅', 0,   18),
  ('sheen_star',       'Sheen Star',      '25 reviews with photos. Featured testimonial.',       '⭐', 500, 19),
  ('comeback_kid',     'Comeback Kid',    'Booked within 7 days of last wash, 5 times. Locked 4% off all future jobs.', '🔁', 0, 20)
on conflict (id) do nothing;

-- ---------- customer_perks ----------
-- One row per customer — perks compose by greatest-wins (we always read
-- the max of any discount % the user qualifies for) so multiple
-- achievements stacking is intentional, not a bug.
create table if not exists public.customer_perks (
  user_id uuid primary key references public.users(id) on delete cascade,
  -- Stack of discount %s; we apply the max at checkout so they don't
  -- compound (4% + 5% would be a footgun).
  discount_pct int not null default 0,
  -- Reserved for future routing logic. Today: storage only, no enforcement.
  weekend_priority boolean not null default false,
  -- Bookkeeping for "free X for life" perks.
  has_lifetime_express_upgrade boolean not null default false,
  -- Founder cohort flag — set by admin or by Founder achievement.
  is_founder boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.customer_perks enable row level security;
drop policy if exists "perks own read" on public.customer_perks;
create policy "perks own read"
  on public.customer_perks for select using (auth.uid() = user_id);
-- Writes go through the service role (achievements evaluator + admin only).

-- ---------- customer_credits ----------
-- One-shot freebies. Each row is a token: kind + status + claim guard.
create table if not exists public.customer_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  -- 'free_wash' covers any tier-pegged credit (e.g. Showroom Detail);
  -- service_tier_name names which tier this credit can apply to.
  kind text not null check (kind in ('free_wash')),
  service_category text not null check (service_category in ('auto', 'home', 'big_rig')),
  service_tier_name text not null,
  source_achievement_id text references public.achievements(id),
  status text not null default 'available' check (status in ('available', 'reserved', 'redeemed', 'expired')),
  reserved_for_booking_id uuid references public.bookings(id),
  redeemed_for_booking_id uuid references public.bookings(id),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  redeemed_at timestamptz
);

create index if not exists customer_credits_user_status_idx
  on public.customer_credits (user_id, status);

alter table public.customer_credits enable row level security;
drop policy if exists "credits own read" on public.customer_credits;
create policy "credits own read"
  on public.customer_credits for select using (auth.uid() = user_id);

-- ---------- reviews.has_photo ----------
-- Lets us count "reviews with photos" without joining booking_photos.
alter table public.reviews
  add column if not exists has_photo boolean not null default false,
  add column if not exists photo_path text;

-- ---------- vehicles.vehicle_class ----------
-- Granular body style — needed for the Hot Wheels achievement and useful
-- for future routing (some pros only do trucks). NULL = unclassified;
-- we never auto-set it to avoid false positives on the achievement.
alter table public.vehicles
  add column if not exists vehicle_class text
    check (vehicle_class in ('sedan', 'suv', 'truck', 'van', 'coupe', 'sports', 'wagon', 'hatchback', 'ev', 'classic', 'other'));

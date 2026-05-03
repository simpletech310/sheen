-- =============================================================
-- Detailing add-ons + functional washer tier ladder.
--
-- Two layers landing in this migration:
--
-- 1. service_addons / booking_addons
--    Customers stack composable extras (interior shampoo, ceramic,
--    paint correction, etc.) on top of their base tier. Each addon
--    has its own price, duration, capability requirement, and tier
--    gate. Snapshotted onto the booking at checkout so price changes
--    don't rewrite history.
--
-- 2. washer_profiles.tier + capabilities
--    Real Rookie -> Pro -> Elite -> Legend ladder, recomputed every
--    time a booking flips to 'completed'. Pulls double duty: shows
--    progress in the pro dashboard AND gates which addons a pro can
--    claim (capability flag necessary, but not sufficient — tier
--    must clear addon's required_tier too).
--
-- Money flow stays unchanged: the existing payout pipeline reads
-- bookings.service_cents (which now includes addon prices summed
-- in by the checkout endpoint), runs computeFees on the total,
-- and transfers the net. booking_addons.washer_payout_cents is
-- a per-line snapshot for receipts/disputes — not the source of
-- truth for the transfer amount.
-- =============================================================

-- ---------- service_addons catalog ----------
create table if not exists public.service_addons (
  id uuid primary key default gen_random_uuid(),
  -- Stable string id used in client code, translation keys, and
  -- booking_addons snapshots. Renaming a row would orphan history,
  -- so codes are forever.
  code text unique not null,
  category text not null check (category in ('auto', 'big_rig')),
  name text not null,
  short_desc text,
  base_price_cents int not null check (base_price_cents > 0),
  -- Solo-washer payout for this addon at the sedan baseline
  -- (price * 0.78). Used for display only — actual transfer math
  -- runs on the summed booking total in lib/payout/release.ts.
  washer_payout_cents int not null check (washer_payout_cents > 0),
  duration_minutes int not null check (duration_minutes > 0),
  -- Flag the washer needs to have ticked on their profile.
  -- Same string lives in washer_profiles.capabilities JSONB keys.
  required_capability text not null,
  -- Minimum tier required to even see the job in the queue.
  -- 'rookie' = anyone, 'pro' / 'elite' / 'legend' lock progressively.
  required_tier text not null default 'rookie'
    check (required_tier in ('rookie', 'pro', 'elite', 'legend')),
  -- Hide the addon when its function is already inside a base tier
  -- (e.g. paint_correction is built into Showroom). NULL = compatible
  -- with every tier in the category.
  compatible_tiers text[],
  -- Premium add-ons (ceramic, shampoo, paint correction, etc.) take
  -- longer on a truck than a sedan. When true, the booking flow
  -- multiplies price + payout + duration by the vehicle-size
  -- multiplier (1.0 sedan / 1.25 SUV / 1.5 truck).
  size_multiplier_applies boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists service_addons_category_idx
  on public.service_addons (category, sort_order)
  where active = true;

alter table public.service_addons enable row level security;

-- Public read for the catalog (anonymous booking flow needs to see
-- the menu before login). Writes service-role only.
drop policy if exists "addons public read" on public.service_addons;
create policy "addons public read"
  on public.service_addons for select using (active = true);


-- ---------- booking_addons (per-booking snapshot) ----------
create table if not exists public.booking_addons (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  addon_id uuid not null references public.service_addons(id),
  -- Denormalised so receipts + disputes stay readable even if the
  -- catalog row is later renamed or deactivated.
  addon_code text not null,
  addon_name text not null,
  -- Final per-line price after vehicle-size multiplier applied.
  price_cents int not null check (price_cents > 0),
  -- Solo-washer payout for this line — display only. Real transfer
  -- amount = computeFees(bookings.service_cents).washerNet.
  washer_payout_cents int not null check (washer_payout_cents > 0),
  duration_minutes int not null check (duration_minutes > 0),
  size_multiplier numeric(3,2) not null default 1.00
    check (size_multiplier in (1.00, 1.25, 1.50)),
  created_at timestamptz not null default now()
);

create index if not exists booking_addons_booking_idx
  on public.booking_addons (booking_id);

alter table public.booking_addons enable row level security;

-- Booking owner reads their own addons.
drop policy if exists "booking addons customer read" on public.booking_addons;
create policy "booking addons customer read"
  on public.booking_addons for select
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_addons.booking_id
        and b.customer_id = auth.uid()
    )
  );

-- Assigned washer / partner reads their booking's addons.
drop policy if exists "booking addons pro read" on public.booking_addons;
create policy "booking addons pro read"
  on public.booking_addons for select
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_addons.booking_id
        and (b.assigned_washer_id = auth.uid() or b.assigned_partner_id = auth.uid())
    )
  );

-- Pending / unassigned bookings: any active washer can read addons
-- so the queue eligibility filter works. Mirrors the bookings RLS.
drop policy if exists "booking addons queue read" on public.booking_addons;
create policy "booking addons queue read"
  on public.booking_addons for select
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_addons.booking_id
        and b.status = 'pending'
        and b.assigned_washer_id is null
        and b.assigned_partner_id is null
    )
    and exists (
      select 1 from public.washer_profiles wp
      where wp.user_id = auth.uid() and wp.status = 'active'
    )
  );

-- Writes happen via service role only (checkout endpoint).


-- ---------- washer_profiles: tier + capabilities map ----------
alter table public.washer_profiles
  add column if not exists tier text not null default 'rookie'
    check (tier in ('rookie', 'pro', 'elite', 'legend')),
  -- JSONB map keyed by addon code. JSONB chosen over per-addon
  -- boolean columns so adding a new addon doesn't require a schema
  -- migration. Trade-off: typo'd codes don't error — guard at API
  -- layer where the catalog is the source of truth.
  add column if not exists capabilities jsonb not null default '{}'::jsonb,
  -- When we last warned a pro that their rating dropped them under
  -- their tier's floor. 30-day grace before auto-demotion kicks in.
  add column if not exists tier_demotion_warned_at timestamptz;

create index if not exists washer_profiles_tier_idx
  on public.washer_profiles (tier);


-- ---------- recompute_washer_tier function ----------
-- Computes a pro's tier from jobs_completed + rating_avg.
-- Mirrors lib/tier.ts:computeTier — keep both in sync if thresholds
-- change.
--
-- Tier table:
--   Legend  150+ jobs, rating >= 4.8
--   Elite    50+ jobs, rating >= 4.7
--   Pro      10+ jobs, rating >= 4.5
--   Rookie   default
--
-- Rating gate: a pro with sub-threshold rating stays at the highest
-- tier whose rating gate they clear. So 200 jobs at 4.6 lands as Pro,
-- not Legend.
create or replace function public.recompute_washer_tier(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_jobs int;
  v_rating numeric;
  v_old_tier text;
  v_new_tier text;
  v_old_rank int;
  v_new_rank int;
begin
  select jobs_completed, coalesce(rating_avg, 5.0), tier
    into v_jobs, v_rating, v_old_tier
  from public.washer_profiles
  where user_id = p_user_id;

  if v_jobs is null then return; end if;

  if v_jobs >= 150 and v_rating >= 4.8 then
    v_new_tier := 'legend';
  elsif v_jobs >= 50 and v_rating >= 4.7 then
    v_new_tier := 'elite';
  elsif v_jobs >= 10 and v_rating >= 4.5 then
    v_new_tier := 'pro';
  else
    v_new_tier := 'rookie';
  end if;

  -- Rank tiers numerically so we can tell promotion from demotion.
  v_old_rank := case v_old_tier
    when 'legend' then 4 when 'elite' then 3 when 'pro' then 2 else 1 end;
  v_new_rank := case v_new_tier
    when 'legend' then 4 when 'elite' then 3 when 'pro' then 2 else 1 end;

  if v_new_tier <> v_old_tier then
    update public.washer_profiles
      set tier = v_new_tier,
          tier_demotion_warned_at = case
            when v_new_rank < v_old_rank then now()
            else null
          end
      where user_id = p_user_id;
  end if;
end;
$$;


-- ---------- trigger: recompute on booking completion ----------
-- Fires when a booking's status flips to 'funded' (post-payout).
-- We use 'funded' rather than 'completed' so demotion can't happen
-- before the pro is actually paid for the job — protects against a
-- race where a low-rating new review lands between complete and
-- payout and yanks the pro's tier mid-flight.
create or replace function public.trigger_recompute_washer_tier()
returns trigger
language plpgsql
as $$
begin
  if NEW.status = 'funded'
     and (OLD.status is distinct from 'funded')
     and NEW.assigned_washer_id is not null
  then
    perform public.recompute_washer_tier(NEW.assigned_washer_id);
  end if;
  return NEW;
end;
$$;

drop trigger if exists bookings_recompute_washer_tier on public.bookings;
create trigger bookings_recompute_washer_tier
  after update on public.bookings
  for each row
  execute function public.trigger_recompute_washer_tier();


-- ---------- trigger: recompute on rating change ----------
-- Pros can drop a tier when a bad review pulls their average under
-- the floor. Fires whenever rating_avg moves on washer_profiles.
create or replace function public.trigger_recompute_on_rating_change()
returns trigger
language plpgsql
as $$
begin
  if NEW.rating_avg is distinct from OLD.rating_avg then
    perform public.recompute_washer_tier(NEW.user_id);
  end if;
  return NEW;
end;
$$;

drop trigger if exists washer_profiles_rating_recompute on public.washer_profiles;
create trigger washer_profiles_rating_recompute
  after update on public.washer_profiles
  for each row
  when (NEW.rating_avg is distinct from OLD.rating_avg)
  execute function public.trigger_recompute_on_rating_change();


-- ---------- tier-promotion achievements ----------
-- Tied to washer_profiles.tier transitions. Awarded by lib/loyalty.ts
-- checkAchievements() based on jobs_completed + rating_avg.
insert into public.achievements (id, display_name, description, icon, bonus_points, sort_order) values
  ('tier_pro',    'Promoted: Pro',    '10 jobs at 4.5+ rating. Unlocks detailing add-ons (interior shampoo, leather, engine bay, headlight restore).', '⬆',  300, 31),
  ('tier_elite',  'Promoted: Elite',  '50 jobs at 4.7+ rating. Unlocks ceramic spray seal + paint correction.',  '★', 750, 32),
  ('tier_legend', 'Promoted: Legend', '150 jobs at 4.8+ rating. Unlocks the highest-paying jobs — 2-year ceramic coating.', '👑', 2000, 33)
on conflict (id) do nothing;


-- ---------- backfill ----------
-- Snap every existing pro to their correct tier on day one.
do $$
declare
  rec record;
begin
  for rec in select user_id from public.washer_profiles loop
    perform public.recompute_washer_tier(rec.user_id);
  end loop;
end $$;

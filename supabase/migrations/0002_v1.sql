-- SHEEN v1 — memberships, loyalty, achievements, realtime positions, push, claims, support, audit log

-- =====================================================================
-- Enums
-- =====================================================================
do $$ begin create type membership_status as enum ('active','past_due','cancelled','paused');
exception when duplicate_object then null; end $$;
do $$ begin create type plan_tier as enum ('basic','pro','elite');
exception when duplicate_object then null; end $$;
do $$ begin create type claim_status as enum ('open','approved','denied','paid','disputed');
exception when duplicate_object then null; end $$;
do $$ begin create type ticket_status as enum ('open','pending','resolved','closed');
exception when duplicate_object then null; end $$;

-- =====================================================================
-- Memberships
-- =====================================================================
create table if not exists public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  tier plan_tier not null,
  display_name text not null,
  monthly_price_cents int not null,
  included_washes int not null,
  max_service_tier text not null,
  stripe_price_id text,
  active bool default true,
  sort_order int default 0,
  description text
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan_id uuid not null references public.membership_plans(id),
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status membership_status not null default 'active',
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  washes_used int default 0,
  cancel_at_period_end bool default false,
  created_at timestamptz default now()
);

create index if not exists memberships_user_idx on public.memberships(user_id);

-- =====================================================================
-- Loyalty + achievements
-- =====================================================================
create table if not exists public.loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  points int not null,
  reason text not null,
  booking_id uuid references public.bookings(id),
  created_at timestamptz default now()
);

create index if not exists loyalty_user_idx on public.loyalty_ledger(user_id);

create table if not exists public.achievements (
  id text primary key,
  display_name text not null,
  description text not null,
  icon text,
  bonus_points int default 0,
  sort_order int default 0
);

create table if not exists public.user_achievements (
  user_id uuid references public.users(id) on delete cascade,
  achievement_id text references public.achievements(id),
  unlocked_at timestamptz default now(),
  primary key (user_id, achievement_id)
);

-- Helper: total loyalty point balance per user
create or replace view public.loyalty_balances as
  select user_id, coalesce(sum(points), 0)::int as balance
  from public.loyalty_ledger
  group by user_id;

-- =====================================================================
-- Realtime washer positions
-- =====================================================================
create table if not exists public.washer_positions (
  washer_id uuid primary key references public.users(id) on delete cascade,
  lat numeric(9,6) not null,
  lng numeric(9,6) not null,
  heading int,
  speed_mph int,
  updated_at timestamptz default now()
);

-- =====================================================================
-- Push notifications
-- =====================================================================
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now()
);

-- =====================================================================
-- Damage claims
-- =====================================================================
create table if not exists public.damage_claims (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id),
  customer_id uuid not null references public.users(id),
  description text not null,
  amount_cents int,
  photos text[] default '{}',
  status claim_status default 'open',
  resolution_notes text,
  resolved_by uuid references public.users(id),
  resolved_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists damage_status_idx on public.damage_claims(status);

-- =====================================================================
-- Support tickets
-- =====================================================================
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  subject text not null,
  body text not null,
  status ticket_status default 'open',
  assignee_id uuid references public.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists support_status_idx on public.support_tickets(status);

-- =====================================================================
-- Audit log
-- =====================================================================
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id),
  action text not null,
  target_type text,
  target_id uuid,
  payload jsonb,
  created_at timestamptz default now()
);

create index if not exists audit_actor_idx on public.audit_log(actor_id);
create index if not exists audit_created_idx on public.audit_log(created_at desc);

-- =====================================================================
-- Extend bookings with v1 fields
-- =====================================================================
do $$ begin
  alter table public.bookings add column if not exists membership_id uuid references public.memberships(id);
  alter table public.bookings add column if not exists used_credit_cents int default 0;
  alter table public.bookings add column if not exists points_earned int default 0;
exception when others then null; end $$;

-- =====================================================================
-- Extend users with phone verification
-- =====================================================================
do $$ begin
  alter table public.users add column if not exists phone_verified_at timestamptz;
  alter table public.users add column if not exists notif_email bool default true;
  alter table public.users add column if not exists notif_sms bool default true;
  alter table public.users add column if not exists notif_push bool default true;
exception when others then null; end $$;

-- =====================================================================
-- RLS for new tables
-- =====================================================================
alter table public.membership_plans enable row level security;
alter table public.memberships enable row level security;
alter table public.loyalty_ledger enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.washer_positions enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.damage_claims enable row level security;
alter table public.support_tickets enable row level security;
alter table public.audit_log enable row level security;

-- Membership plans: public read (so /app/membership can list)
drop policy if exists "membership_plans public read" on public.membership_plans;
create policy "membership_plans public read" on public.membership_plans for select using (true);

-- Memberships: own row
drop policy if exists "memberships own read" on public.memberships;
drop policy if exists "memberships own insert" on public.memberships;
drop policy if exists "memberships own update" on public.memberships;
create policy "memberships own read" on public.memberships for select using (auth.uid() = user_id);
create policy "memberships own insert" on public.memberships for insert with check (auth.uid() = user_id);
create policy "memberships own update" on public.memberships for update using (auth.uid() = user_id);

-- Loyalty ledger: own read; inserts via service role only
drop policy if exists "loyalty own read" on public.loyalty_ledger;
create policy "loyalty own read" on public.loyalty_ledger for select using (auth.uid() = user_id);

-- Achievements: public read (catalog)
drop policy if exists "achievements public read" on public.achievements;
create policy "achievements public read" on public.achievements for select using (true);

-- User achievements: own read
drop policy if exists "user_achievements own read" on public.user_achievements;
create policy "user_achievements own read" on public.user_achievements for select using (auth.uid() = user_id);

-- Washer positions: read by anyone with the booking (RLS via bookings link is complex; allow reading any active position — these are coarse and short-lived)
drop policy if exists "washer_positions read all" on public.washer_positions;
drop policy if exists "washer_positions update own" on public.washer_positions;
create policy "washer_positions read all" on public.washer_positions for select using (true);
create policy "washer_positions update own" on public.washer_positions for all using (auth.uid() = washer_id) with check (auth.uid() = washer_id);

-- Push subs: own row
drop policy if exists "push_subs own" on public.push_subscriptions;
create policy "push_subs own" on public.push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Damage claims: customer-of-booking can insert + read; admin reads all
drop policy if exists "claims customer read" on public.damage_claims;
drop policy if exists "claims customer insert" on public.damage_claims;
drop policy if exists "claims admin all" on public.damage_claims;
create policy "claims customer read" on public.damage_claims for select using (auth.uid() = customer_id);
create policy "claims customer insert" on public.damage_claims for insert with check (auth.uid() = customer_id);
create policy "claims admin all" on public.damage_claims for all
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
  with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

-- Support tickets: own + admin
drop policy if exists "support own" on public.support_tickets;
drop policy if exists "support admin all" on public.support_tickets;
create policy "support own" on public.support_tickets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "support admin all" on public.support_tickets for all
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
  with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

-- Audit log: admin-only read
drop policy if exists "audit admin read" on public.audit_log;
create policy "audit admin read" on public.audit_log for select
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

-- =====================================================================
-- Add admin override RLS policies on existing tables
-- =====================================================================
drop policy if exists "users admin read all" on public.users;
create policy "users admin read all" on public.users for select
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

drop policy if exists "users admin update all" on public.users;
create policy "users admin update all" on public.users for update
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

drop policy if exists "bookings admin all" on public.bookings;
create policy "bookings admin all" on public.bookings for all
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
  with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

drop policy if exists "washers admin all" on public.washer_profiles;
create policy "washers admin all" on public.washer_profiles for all
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
  with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

drop policy if exists "partners admin all" on public.partner_profiles;
create policy "partners admin all" on public.partner_profiles for all
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
  with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

drop policy if exists "payouts admin read" on public.payouts;
create policy "payouts admin read" on public.payouts for select
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

-- =====================================================================
-- Realtime publication wiring
-- =====================================================================
do $$ begin
  -- enable realtime on these tables (Supabase default publication is supabase_realtime)
  perform pg_catalog.set_config('search_path', 'public', false);
  begin
    alter publication supabase_realtime add table public.bookings;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.booking_events;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.washer_positions;
  exception when duplicate_object then null; end;
end $$;

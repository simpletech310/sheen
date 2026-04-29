-- SHEEN — Phase 1 MVP schema
-- Drop existing if rerunning (idempotent for dev)
do $$ begin
  drop policy if exists "customers see own bookings" on public.bookings;
  drop policy if exists "washers see assigned bookings" on public.bookings;
  drop policy if exists "partners see assigned bookings" on public.bookings;
  drop policy if exists "washers see unclaimed queue" on public.bookings;
  drop policy if exists "users insert their own row" on public.users;
  drop policy if exists "users see own row" on public.users;
exception when undefined_table then null; end $$;

-- Enums
do $$ begin
  create type user_role as enum ('customer','washer','partner_owner','admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create type job_status as enum ('pending','matched','en_route','arrived','in_progress','completed','cancelled','disputed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type job_category as enum ('auto','home','commercial');
exception when duplicate_object then null; end $$;
do $$ begin
  create type washer_status as enum ('pending','active','suspended');
exception when duplicate_object then null; end $$;

-- Core tables
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'customer',
  full_name text,
  email text,
  phone text,
  locale text default 'en-US',
  created_at timestamptz default now()
);

create table if not exists public.customer_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  default_address_id uuid,
  default_payment_method_id text,
  lifetime_spend_cents int default 0,
  trip_count int default 0
);

create table if not exists public.washer_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  status washer_status default 'pending',
  service_radius_miles int default 5,
  has_own_water bool default true,
  has_own_power bool default true,
  has_pressure_washer bool default false,
  can_detail_interior bool default true,
  can_do_paint_correction bool default false,
  insurance_doc_url text,
  insurance_expires_at date,
  background_check_status text default 'pending',
  stripe_account_id text,
  rating_avg numeric(3,2),
  jobs_completed int default 0,
  bio text,
  base_lat numeric(9,6),
  base_lng numeric(9,6)
);

create table if not exists public.partner_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  business_name text not null,
  slug text unique not null,
  tagline text,
  hero_image text,
  portfolio_images text[] default '{}',
  service_areas text[] default '{}',
  capabilities text[] default '{}',
  stripe_account_id text,
  insurance_doc_url text,
  insurance_expires_at date,
  license_number text,
  is_founding bool default false,
  rating_avg numeric(3,2),
  jobs_completed int default 0,
  status text default 'pending',
  years_in_business int,
  created_at timestamptz default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  category job_category not null,
  tier_name text not null,
  base_price_cents int not null,
  duration_minutes int not null,
  requires_partner bool default false,
  description text,
  included text[] default '{}',
  active bool default true,
  sort_order int default 0
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  tag text,
  street text not null,
  unit text,
  city text not null,
  state text not null,
  zip text not null,
  lat numeric(9,6),
  lng numeric(9,6),
  notes text,
  is_default bool default false,
  created_at timestamptz default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  year int,
  make text,
  model text,
  color text,
  plate text,
  is_default bool default false,
  created_at timestamptz default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.users(id),
  service_id uuid not null references public.services(id),
  vehicle_id uuid references public.vehicles(id),
  address_id uuid references public.addresses(id),
  scheduled_window_start timestamptz not null,
  scheduled_window_end timestamptz not null,
  status job_status not null default 'pending',
  assigned_washer_id uuid references public.users(id),
  assigned_partner_id uuid references public.users(id),
  service_cents int not null,
  fees_cents int not null,
  tip_cents int default 0,
  total_cents int not null,
  stripe_payment_intent_id text,
  qr_check_in_code text not null default substr(md5(random()::text || clock_timestamp()::text), 1, 4),
  customer_note text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists bookings_customer_idx on public.bookings (customer_id);
create index if not exists bookings_washer_idx on public.bookings (assigned_washer_id);
create index if not exists bookings_partner_idx on public.bookings (assigned_partner_id);

create table if not exists public.booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  type text not null,
  actor_id uuid references public.users(id),
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.booking_photos (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  kind text not null check (kind in ('before','after')),
  storage_path text not null,
  uploaded_at timestamptz default now()
);

create table if not exists public.reviews (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  rating_int int not null check (rating_int between 1 and 5),
  comment text,
  reviewer_id uuid not null references public.users(id),
  reviewee_id uuid not null references public.users(id),
  created_at timestamptz default now()
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  washer_id uuid references public.users(id),
  partner_id uuid references public.users(id),
  booking_id uuid not null references public.bookings(id),
  amount_cents int not null,
  stripe_transfer_id text,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  washer_id uuid not null references public.users(id) on delete cascade,
  day_of_week int,
  specific_date date,
  start_time time,
  end_time time,
  blocked bool default false
);

-- Trigger: auto-insert public.users row + customer_profiles when auth.users row is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, role)
  values (new.id, new.email, 'customer')
  on conflict (id) do nothing;
  insert into public.customer_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.users enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.washer_profiles enable row level security;
alter table public.partner_profiles enable row level security;
alter table public.services enable row level security;
alter table public.addresses enable row level security;
alter table public.vehicles enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;
alter table public.booking_photos enable row level security;
alter table public.reviews enable row level security;
alter table public.payouts enable row level security;
alter table public.availability enable row level security;

-- Users
create policy "users see own row" on public.users for select using (auth.uid() = id);
create policy "users update own row" on public.users for update using (auth.uid() = id);

-- Customer profile
create policy "cust read own" on public.customer_profiles for select using (auth.uid() = user_id);
create policy "cust update own" on public.customer_profiles for update using (auth.uid() = user_id);

-- Washer profile (washer reads own, public sees active for marketing)
create policy "washer read own" on public.washer_profiles for select using (auth.uid() = user_id);
create policy "washer update own" on public.washer_profiles for update using (auth.uid() = user_id);
create policy "washer insert own" on public.washer_profiles for insert with check (auth.uid() = user_id);

-- Partner profile (public read for /p/[slug] + directory)
create policy "partners public read" on public.partner_profiles for select using (true);
create policy "partner update own" on public.partner_profiles for update using (auth.uid() = user_id);
create policy "partner insert own" on public.partner_profiles for insert with check (auth.uid() = user_id);

-- Services (public read)
create policy "services public read" on public.services for select using (true);

-- Addresses, vehicles
create policy "addresses own" on public.addresses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "vehicles own" on public.vehicles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Bookings
create policy "customers see own bookings" on public.bookings for select using (auth.uid() = customer_id);
create policy "washers see assigned bookings" on public.bookings for select using (auth.uid() = assigned_washer_id);
create policy "partners see assigned bookings" on public.bookings for select using (auth.uid() = assigned_partner_id);
create policy "washers see unclaimed queue" on public.bookings for select using (status = 'pending' and assigned_washer_id is null);
create policy "customers create own bookings" on public.bookings for insert with check (auth.uid() = customer_id);
create policy "customers update own bookings" on public.bookings for update using (auth.uid() = customer_id);
create policy "washers update assigned bookings" on public.bookings for update using (auth.uid() = assigned_washer_id);

-- Booking events / photos / reviews / payouts
create policy "events read involved" on public.booking_events for select using (
  exists (select 1 from public.bookings b where b.id = booking_id and (b.customer_id = auth.uid() or b.assigned_washer_id = auth.uid() or b.assigned_partner_id = auth.uid()))
);
create policy "events insert involved" on public.booking_events for insert with check (
  exists (select 1 from public.bookings b where b.id = booking_id and (b.customer_id = auth.uid() or b.assigned_washer_id = auth.uid() or b.assigned_partner_id = auth.uid()))
);

create policy "photos read involved" on public.booking_photos for select using (
  exists (select 1 from public.bookings b where b.id = booking_id and (b.customer_id = auth.uid() or b.assigned_washer_id = auth.uid()))
);
create policy "photos insert washer" on public.booking_photos for insert with check (
  exists (select 1 from public.bookings b where b.id = booking_id and b.assigned_washer_id = auth.uid())
);

create policy "reviews public read" on public.reviews for select using (true);
create policy "reviews insert involved" on public.reviews for insert with check (
  exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid())
);

create policy "payouts read own" on public.payouts for select using (auth.uid() = washer_id or auth.uid() = partner_id);

create policy "availability own" on public.availability for all using (auth.uid() = washer_id) with check (auth.uid() = washer_id);

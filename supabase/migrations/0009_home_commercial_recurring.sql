-- Open up Home + Commercial categories and add recurring bookings.

-- =============================================================
-- 1. Home services seed.
--    Categories use the existing job_category enum ('auto','home','commercial').
-- =============================================================
insert into public.services (category, tier_name, base_price_cents, duration_minutes, description, included, sort_order)
values
  ('home', 'Driveway & Walkway', 18500, 90,
    'Up to 800 sq ft. Pressure-wash + concrete-safe rinse.',
    array['Driveway', 'Walkway', 'Concrete-safe rinse', 'Surface streak removal'],
    10),
  ('home', 'Deck or Patio', 9500, 60,
    'Wood-safe pH soft-wash + low-pressure rinse.',
    array['Wood-safe soft-wash', 'Low-pressure rinse', 'Furniture pull/replace'],
    20),
  ('home', 'Full Exterior', 38500, 240,
    'House siding + drive + walks. Soft-wash certified.',
    array['Siding soft-wash', 'Driveway', 'Walkways', 'Window pre-rinse'],
    30),
  ('home', 'Solar Panel Wash', 1200, 5,
    'Per panel. De-ionised water + soft cloth, no chemicals.',
    array['De-ionised water', 'Soft cloth', 'Panel inspection'],
    40)
on conflict do nothing;

-- =============================================================
-- 2. Commercial leads — quoted jobs route here for ops to follow up.
-- =============================================================
create type lead_status as enum ('new','contacted','quoted','won','lost');

create table if not exists public.commercial_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  business_name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip text,
  service_type text,
  square_footage int,
  frequency text,
  notes text,
  status lead_status default 'new',
  assigned_to uuid references public.users(id),
  resolved_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists commercial_leads_status_idx on public.commercial_leads (status);

alter table public.commercial_leads enable row level security;

drop policy if exists "leads insert anyone" on public.commercial_leads;
create policy "leads insert anyone"
  on public.commercial_leads for insert
  with check (true);

drop policy if exists "leads read own" on public.commercial_leads;
create policy "leads read own"
  on public.commercial_leads for select
  using (user_id = auth.uid());

drop policy if exists "leads admin all" on public.commercial_leads;
create policy "leads admin all"
  on public.commercial_leads for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- =============================================================
-- 3. Recurring booking templates.
--    A template captures everything we need to materialize a new
--    booking every period. Cron job at /api/cron/recurring runs
--    nightly and creates bookings whose next_run_at is within 36h.
-- =============================================================
create type recurrence_freq as enum ('weekly','biweekly','monthly');

create table if not exists public.recurring_booking_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  service_id uuid not null references public.services(id),
  address_id uuid references public.addresses(id),
  vehicle_ids uuid[] not null default '{}',
  frequency recurrence_freq not null,
  preferred_window text not null, -- e.g. "tomorrow_10_12" template, day-of-week aware
  next_run_at timestamptz not null,
  active bool not null default true,
  paused bool not null default false,
  created_at timestamptz default now(),
  last_materialized_at timestamptz,
  last_booking_id uuid references public.bookings(id)
);

create index if not exists recurring_active_next_idx
  on public.recurring_booking_templates (active, paused, next_run_at)
  where active = true and paused = false;

alter table public.recurring_booking_templates enable row level security;

drop policy if exists "recurring own" on public.recurring_booking_templates;
create policy "recurring own"
  on public.recurring_booking_templates for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "recurring admin all" on public.recurring_booking_templates;
create policy "recurring admin all"
  on public.recurring_booking_templates for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Track when a booking came from a recurring template (so we can show
-- "From your bi-weekly schedule" on the wash detail page).
alter table public.bookings
  add column if not exists recurring_template_id uuid
    references public.recurring_booking_templates(id);

create index if not exists bookings_recurring_idx
  on public.bookings (recurring_template_id)
  where recurring_template_id is not null;

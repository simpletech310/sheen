-- Membership category gating, washer @handle constraints, and the
-- platform penalties system.

-- =============================================================
-- 1. Membership plans: which categories does this plan cover, and
--    which exact tier names are allowed inside that category?
-- =============================================================
alter table public.membership_plans
  add column if not exists service_categories text[] not null default '{auto}',
  add column if not exists allowed_tier_names text[] not null default '{}';

-- Backfill from existing seed (Basic / Pro / Elite). The plans are auto-only
-- today; we add the explicit tier allowlists so checks are deterministic.
update public.membership_plans
set
  service_categories = '{auto}',
  allowed_tier_names = case
    when tier = 'basic' then array['Express Wash', 'Full Detail']
    when tier = 'pro'   then array['Express Wash', 'Full Detail', 'Premium Detail']
    when tier = 'elite' then array['Express Wash', 'Full Detail', 'Premium Detail', 'Showroom']
    else allowed_tier_names
  end
where allowed_tier_names = '{}';

-- =============================================================
-- 2. Washer handle: keep alphanumeric + length 3-20 so @handles are
--    memorable. Existing handles default to upper(substr(uuid)) and
--    pass this check.
-- =============================================================
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'wash_handle_format'
  ) then
    alter table public.washer_profiles
      add constraint wash_handle_format
      check (
        wash_handle is null
        or wash_handle ~ '^[A-Z0-9]{3,20}$'
      );
  end if;
end $$;

-- =============================================================
-- 3. Penalties — automatic and manual fines applied to either party
--    of a booking. We store the dollar amount and the reason; the
--    Stripe-side enforcement (refund withhold, transfer reversal,
--    next-payout debit) lives in app code.
-- =============================================================
do $$ begin
  if not exists (select 1 from pg_type where typname = 'penalty_status') then
    create type penalty_status as enum ('pending','applied','waived','disputed');
  end if;
  if not exists (select 1 from pg_type where typname = 'penalty_party') then
    create type penalty_party as enum ('customer','washer','partner');
  end if;
end $$;

create table if not exists public.penalties (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  party penalty_party not null,
  -- short reason code: 'late_cancel', 'customer_no_show', 'no_water',
  -- 'no_power', 'site_unsafe', 'pro_no_show', 'pro_late', 'pro_cancel',
  -- 'damage', 'misconduct', 'other'.
  reason text not null,
  amount_cents int not null default 0,
  status penalty_status not null default 'pending',
  notes text,
  applied_by uuid references public.users(id),
  applied_at timestamptz,
  waived_by uuid references public.users(id),
  waived_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists penalties_user_idx on public.penalties (user_id, created_at desc);
create index if not exists penalties_booking_idx on public.penalties (booking_id);
create index if not exists penalties_status_idx on public.penalties (status);

alter table public.penalties enable row level security;

drop policy if exists "penalties read own" on public.penalties;
create policy "penalties read own"
  on public.penalties for select
  using (user_id = auth.uid());

drop policy if exists "penalties read by booking parties" on public.penalties;
create policy "penalties read by booking parties"
  on public.penalties for select
  using (
    booking_id is not null and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (
          b.customer_id = auth.uid()
          or b.assigned_washer_id = auth.uid()
          or b.assigned_partner_id = auth.uid()
        )
    )
  );

drop policy if exists "penalties insert by booking parties" on public.penalties;
create policy "penalties insert by booking parties"
  on public.penalties for insert
  with check (
    booking_id is not null and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (
          b.customer_id = auth.uid()
          or b.assigned_washer_id = auth.uid()
          or b.assigned_partner_id = auth.uid()
        )
    )
  );

drop policy if exists "penalties admin all" on public.penalties;
create policy "penalties admin all"
  on public.penalties for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- =============================================================
-- 4. Booking issue flags so the pro can record what happened on site.
--    The flag updates booking.status to 'issue' (existing job_status
--    enum doesn't have that value yet — use 'cancelled' + an event so
--    we don't have to alter the enum mid-flight).
-- =============================================================
-- Nothing schema-wise needed beyond the penalties table; the API will
-- update booking.status to 'cancelled' on a customer no-show flag and
-- attach a penalty.

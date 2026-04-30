-- Multi-vehicle bookings: a single booking can cover N saved vehicles.
-- Each (booking, vehicle) pair has its own pre-wash condition photos so the
-- pro can see exactly what they're walking into.

-- 1. Per-vehicle care instructions ("only ceramic-safe soap", "watch the
--    rear bumper", etc.). Lives on the vehicle so it auto-applies to every
--    future booking of that vehicle.
alter table public.vehicles
  add column if not exists notes text;

-- 2. Many-to-many between bookings and vehicles. Uses a join table so we
--    can carry per-vehicle metadata (condition photos) for each booking.
create table if not exists public.booking_vehicles (
  booking_id uuid not null references public.bookings(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  condition_photo_paths text[] not null default '{}',
  created_at timestamptz default now(),
  primary key (booking_id, vehicle_id)
);

create index if not exists booking_vehicles_booking_idx
  on public.booking_vehicles (booking_id);
create index if not exists booking_vehicles_vehicle_idx
  on public.booking_vehicles (vehicle_id);

-- 3. Vehicle count on booking — pricing multiplier. We store it instead of
--    counting at read time so historical pricing is reproducible from a
--    single row.
alter table public.bookings
  add column if not exists vehicle_count int not null default 1
    check (vehicle_count between 1 and 10);

-- 4. RLS — customers + assigned pros + admins.
alter table public.booking_vehicles enable row level security;

drop policy if exists "booking_vehicles read for parties" on public.booking_vehicles;
create policy "booking_vehicles read for parties"
  on public.booking_vehicles for select
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (
          b.customer_id = auth.uid()
          or b.assigned_washer_id = auth.uid()
          or b.assigned_partner_id = auth.uid()
        )
    )
  );

drop policy if exists "booking_vehicles insert by customer" on public.booking_vehicles;
create policy "booking_vehicles insert by customer"
  on public.booking_vehicles for insert
  with check (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.customer_id = auth.uid()
    )
  );

drop policy if exists "booking_vehicles update by parties" on public.booking_vehicles;
create policy "booking_vehicles update by parties"
  on public.booking_vehicles for update
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (
          b.customer_id = auth.uid()
          or b.assigned_washer_id = auth.uid()
          or b.assigned_partner_id = auth.uid()
        )
    )
  );

drop policy if exists "booking_vehicles admin all" on public.booking_vehicles;
create policy "booking_vehicles admin all"
  on public.booking_vehicles for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- 5. Backfill: for any existing booking with a single vehicle_id set,
--    create the booking_vehicles row so the new schema covers all history.
insert into public.booking_vehicles (booking_id, vehicle_id)
select b.id, b.vehicle_id
from public.bookings b
where b.vehicle_id is not null
  and not exists (
    select 1 from public.booking_vehicles bv
    where bv.booking_id = b.id and bv.vehicle_id = b.vehicle_id
  );

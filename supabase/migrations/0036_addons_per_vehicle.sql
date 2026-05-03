-- =============================================================
-- Per-vehicle add-on attribution.
--
-- Customers booking a multi-vehicle wash want to pick add-ons
-- per car (e.g. wax the Honda but not the Dodge). Today every
-- booking_addons row is "for the booking" — it's impossible to
-- tell from the receipt or the pro's job card which vehicle the
-- ceramic seal was meant for.
--
-- Adds a nullable booking_vehicle_id link on booking_addons.
-- Nullable so rows pre-migration stay valid (treated as "applies
-- to the whole booking" for backwards compatibility) and add-ons
-- that are inherently per-booking don't have to fake a vehicle id.
--
-- The booking_vehicles table was created with only a composite
-- primary key (booking_id, vehicle_id) — no surrogate id column
-- to FK against. Adding a UUID surrogate `id` first, marked
-- UNIQUE so it can be the FK target. Composite PK stays in
-- place (still enforces no-dup vehicle-per-booking).
--
-- ON DELETE CASCADE so deleting a booking_vehicles row also drops
-- the addons attached to it. Booking deletion already cascades
-- through booking_vehicles → addons via this chain.
-- =============================================================

-- 1. Surrogate id on booking_vehicles
alter table public.booking_vehicles
  add column if not exists id uuid not null default gen_random_uuid();

-- Backfill is automatic for existing rows because the default
-- generates a uuid at column add-time. Now make it unique so it's
-- FK-able. Doing it as a constraint (not changing the PK) avoids
-- having to drop the composite primary key — which would briefly
-- weaken the dup-prevention guarantee.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'booking_vehicles_id_key'
      and conrelid = 'public.booking_vehicles'::regclass
  ) then
    alter table public.booking_vehicles
      add constraint booking_vehicles_id_key unique (id);
  end if;
end $$;

-- 2. FK column on booking_addons
alter table public.booking_addons
  add column if not exists booking_vehicle_id uuid
    references public.booking_vehicles(id) on delete cascade;

create index if not exists booking_addons_vehicle_idx
  on public.booking_addons (booking_vehicle_id)
  where booking_vehicle_id is not null;

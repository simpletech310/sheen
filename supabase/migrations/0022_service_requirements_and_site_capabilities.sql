-- =============================================================
-- Job-routing prerequisites: tag each service with the equipment
-- it needs, and let customers tell us whether their site has
-- water/power. Together they let the queue surface only the
-- jobs a given washer can actually complete.
--
-- Defaults are deliberately permissive (most services don't need
-- a pressure washer; most washers BYO water) so a freshly-
-- migrated DB doesn't suddenly hide jobs from existing pros.
-- =============================================================

-- ---------- services: required equipment ----------
alter table public.services
  add column if not exists requires_water boolean not null default true,
  add column if not exists requires_power boolean not null default false,
  add column if not exists requires_pressure_washer boolean not null default false,
  add column if not exists requires_paint_correction boolean not null default false,
  add column if not exists requires_interior_detail boolean not null default false;

-- Seed which services demand which capability. Idempotent — UPDATE only.
update public.services
  set requires_pressure_washer = true,
      requires_paint_correction = true,
      requires_interior_detail = true
  where tier_name in ('Premium', 'Showroom', 'Showroom Rig');

update public.services
  set requires_pressure_washer = true
  where tier_name in ('Driveway & Walkway', 'Full Exterior', 'Deck/Patio Add-on',
                      'Rig Rinse', 'Trailer Wash', 'Full Rig Detail');

update public.services
  set requires_interior_detail = true
  where tier_name in ('Full Detail', 'Full Rig Detail');

-- Solar panel wash needs deionised water + power for the rinse rig.
update public.services
  set requires_power = true
  where tier_name = 'Solar Panel Wash';

-- ---------- addresses: site capabilities + access ----------
-- has_water / has_power use NULL = "customer hasn't said". The booking
-- form forces the customer to pick yes/no; older saved addresses stay
-- NULL until they next book.
alter table public.addresses
  add column if not exists has_water boolean,
  add column if not exists has_power boolean,
  add column if not exists water_notes text,
  add column if not exists power_notes text,
  add column if not exists gate_code text,
  add column if not exists site_photo_paths text[] not null default '{}'::text[];

-- Useful for the queue's "hide jobs at sites without water unless I BYO"
-- query — addresses are already joined into bookings rows.
create index if not exists addresses_water_power_idx
  on public.addresses (has_water, has_power);

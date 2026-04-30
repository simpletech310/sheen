-- =============================================================
-- Big Rig service category — large vehicle detailing.
--
-- Big rigs (semi tractors, box trucks, sprinter vans, RVs) are NOT
-- a commercial quote workflow — they're regular auto-shaped bookings
-- that just happen to be larger and require equipment-capable pros.
--
-- This migration adds the schema-level pieces: enum value + columns.
-- The 'big_rig' enum value can't be USED in the same transaction it
-- was added in, so seed rows live in 0013_big_rig_seed.sql.
-- =============================================================

-- 1. Enum extension. Postgres will not let us reference 'big_rig'
--    in inserts in the same transaction, so this migration only
--    adds the value; 0013 does the seeding.
alter type job_category add value if not exists 'big_rig';

-- 2. Vehicle type discriminator.
alter table public.vehicles
  add column if not exists vehicle_type text not null default 'auto'
  check (vehicle_type in ('auto','big_rig'));

create index if not exists vehicles_user_type_idx
  on public.vehicles (user_id, vehicle_type);

-- 3. Washer capability flag — pros must opt in to receive big-rig jobs.
alter table public.washer_profiles
  add column if not exists can_wash_big_rig boolean not null default false;

create index if not exists washer_big_rig_idx
  on public.washer_profiles (can_wash_big_rig)
  where can_wash_big_rig = true;

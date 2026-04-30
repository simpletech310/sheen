-- =============================================================
-- Per-service QA checklist. The same checklist runs for every
-- customer of a given tier — keeps the standard consistent without
-- making the pro fight the form. Some items require a photo to count
-- as done; those become the proof-of-work record on the booking.
--
-- Storage:
--   service_checklist_items — the master template, one row per item
--   bookings.checklist_progress — JSONB map per booking
--     { "<item_id>": { "done_at": "<iso>", "photo_path": "<path>" } }
-- =============================================================

create table if not exists public.service_checklist_items (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  sort_order int not null default 0,
  label text not null,
  hint text,
  requires_photo boolean not null default false,
  created_at timestamptz default now()
);

create index if not exists checklist_service_idx
  on public.service_checklist_items (service_id, sort_order);

alter table public.service_checklist_items enable row level security;

-- Public read — pros + customers + admin all need to see the
-- checklist for any tier (customers see "what your pro will do"
-- on the tier page later if we want to surface it).
drop policy if exists "checklist public read" on public.service_checklist_items;
create policy "checklist public read"
  on public.service_checklist_items
  for select using (true);

-- Admin writes via service role only — no UI for editing checklists yet.

-- Booking-level progress.
alter table public.bookings
  add column if not exists checklist_progress jsonb not null default '{}'::jsonb;

-- =============================================================
-- Seed templates. Idempotent — keyed off (service.id, label) so
-- re-running doesn't dupe.
-- =============================================================

-- Helper: insert a row only if a matching label doesn't exist for
-- the given service.
do $$
declare
  v_service_id uuid;
  v_idx int;
  rec record;
begin
  -- ===========================================================
  -- AUTO
  -- ===========================================================

  -- Express
  select id into v_service_id from public.services
    where category = 'auto' and tier_name = 'Express' limit 1;
  if v_service_id is not null then
    v_idx := 0;
    for rec in
      select * from (values
        ('Foam pre-soak applied', 'Cover the whole vehicle, let it dwell.', false),
        ('Two-bucket hand wash complete', 'Wash + rinse buckets, microfiber per panel.', false),
        ('Wheels & tires cleaned', 'Iron remover on wheels, tire cleaner.', false),
        ('Door jambs wiped down', NULL, false),
        ('Windows cleaned (in + out)', NULL, false),
        ('Tire shine applied', NULL, false),
        ('Final walk-around', 'Spot-check for missed water, swirl marks.', false),
        ('After photos', 'At least one wide shot of the finished car.', true)
      ) as t(label, hint, requires_photo)
    loop
      v_idx := v_idx + 1;
      insert into public.service_checklist_items (service_id, sort_order, label, hint, requires_photo)
      select v_service_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.service_checklist_items
        where service_id = v_service_id and label = rec.label
      );
    end loop;
  end if;

  -- Full Detail
  select id into v_service_id from public.services
    where category = 'auto' and tier_name = 'Full Detail' limit 1;
  if v_service_id is not null then
    v_idx := 0;
    for rec in
      select * from (values
        ('Foam pre-soak applied', NULL, false),
        ('Two-bucket hand wash complete', NULL, false),
        ('Wheels, tires, and arches cleaned', NULL, false),
        ('Door jambs + sills wiped', NULL, false),
        ('Interior vacuum (seats, carpet, mats)', 'Lift the mats, vacuum under them.', true),
        ('Dashboard + console wiped', NULL, false),
        ('Cup holders + air vents detailed', NULL, false),
        ('Windows cleaned (in + out)', NULL, false),
        ('Tire shine + trim dressing', NULL, false),
        ('Final walk-around', NULL, false),
        ('After photos', 'Exterior + interior shots.', true)
      ) as t(label, hint, requires_photo)
    loop
      v_idx := v_idx + 1;
      insert into public.service_checklist_items (service_id, sort_order, label, hint, requires_photo)
      select v_service_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.service_checklist_items
        where service_id = v_service_id and label = rec.label
      );
    end loop;
  end if;

  -- Premium
  select id into v_service_id from public.services
    where category = 'auto' and tier_name = 'Premium' limit 1;
  if v_service_id is not null then
    v_idx := 0;
    for rec in
      select * from (values
        ('Foam pre-soak applied', NULL, false),
        ('Two-bucket hand wash complete', NULL, false),
        ('Wheels, tires, and arches cleaned', NULL, false),
        ('Clay bar treatment', 'Whole car, panel by panel. Show the bar.', true),
        ('Hand wax / sealant applied', NULL, false),
        ('Interior vacuum + steam clean', NULL, true),
        ('Leather conditioned', NULL, false),
        ('Trim dressed', NULL, false),
        ('Windows cleaned (in + out)', NULL, false),
        ('Tire shine + arch dressing', NULL, false),
        ('Final walk-around', NULL, false),
        ('After photos', 'Wide + detail shots that show the gloss.', true)
      ) as t(label, hint, requires_photo)
    loop
      v_idx := v_idx + 1;
      insert into public.service_checklist_items (service_id, sort_order, label, hint, requires_photo)
      select v_service_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.service_checklist_items
        where service_id = v_service_id and label = rec.label
      );
    end loop;
  end if;

  -- Showroom
  select id into v_service_id from public.services
    where category = 'auto' and tier_name = 'Showroom' limit 1;
  if v_service_id is not null then
    v_idx := 0;
    for rec in
      select * from (values
        ('Two-bucket hand wash complete', NULL, false),
        ('Clay bar treatment', NULL, true),
        ('Paint correction (compound + polish)', 'Show the swirl test area.', true),
        ('Ceramic top-up applied', NULL, true),
        ('Engine bay detail', NULL, true),
        ('Interior deep clean (steam + vacuum)', NULL, true),
        ('Leather conditioned', NULL, false),
        ('Trim restored / dressed', NULL, false),
        ('Glass treated', NULL, false),
        ('Wheels + tires finished', NULL, false),
        ('Final walk-around with customer', 'Walk them through every panel.', false),
        ('After photos', 'Concours-grade shots — wide + detail.', true)
      ) as t(label, hint, requires_photo)
    loop
      v_idx := v_idx + 1;
      insert into public.service_checklist_items (service_id, sort_order, label, hint, requires_photo)
      select v_service_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.service_checklist_items
        where service_id = v_service_id and label = rec.label
      );
    end loop;
  end if;

  -- ===========================================================
  -- HOME
  -- ===========================================================

  -- Driveway & Walkway
  select id into v_service_id from public.services
    where category = 'home' and tier_name = 'Driveway & Walkway' limit 1;
  if v_service_id is not null then
    v_idx := 0;
    for rec in
      select * from (values
        ('Pre-treatment on oil spots', 'Spot-treat before the wash.', true),
        ('Pressure wash complete', 'Cover all 800 sq ft.', true),
        ('Edges and trim cleaned', NULL, false),
        ('Final rinse', NULL, false),
        ('After photos', 'Wide before/after if available.', true)
      ) as t(label, hint, requires_photo)
    loop
      v_idx := v_idx + 1;
      insert into public.service_checklist_items (service_id, sort_order, label, hint, requires_photo)
      select v_service_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.service_checklist_items
        where service_id = v_service_id and label = rec.label
      );
    end loop;
  end if;

  -- Full Exterior
  select id into v_service_id from public.services
    where category = 'home' and tier_name = 'Full Exterior' limit 1;
  if v_service_id is not null then
    v_idx := 0;
    for rec in
      select * from (values
        ('Driveway + walkways pressure washed', NULL, true),
        ('Soft-wash siding complete', 'Low-pressure, biodegradable cleaner.', true),
        ('Eaves and trim cleaned', NULL, false),
        ('Windows rinsed', NULL, false),
        ('Final rinse', NULL, false),
        ('After photos', 'Wide shots showing the difference.', true)
      ) as t(label, hint, requires_photo)
    loop
      v_idx := v_idx + 1;
      insert into public.service_checklist_items (service_id, sort_order, label, hint, requires_photo)
      select v_service_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.service_checklist_items
        where service_id = v_service_id and label = rec.label
      );
    end loop;
  end if;

  -- Deck/Patio Add-on
  select id into v_service_id from public.services
    where category = 'home' and tier_name = 'Deck/Patio Add-on' limit 1;
  if v_service_id is not null then
    v_idx := 0;
    for rec in
      select * from (values
        ('pH-balanced cleaner applied', 'Deck-safe.', false),
        ('Deck or patio cleaned', NULL, true),
        ('Furniture moved + replaced', NULL, false),
        ('Final rinse', NULL, false),
        ('After photos', NULL, true)
      ) as t(label, hint, requires_photo)
    loop
      v_idx := v_idx + 1;
      insert into public.service_checklist_items (service_id, sort_order, label, hint, requires_photo)
      select v_service_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.service_checklist_items
        where service_id = v_service_id and label = rec.label
      );
    end loop;
  end if;

  -- Solar Panel Wash
  select id into v_service_id from public.services
    where category = 'home' and tier_name = 'Solar Panel Wash' limit 1;
  if v_service_id is not null then
    v_idx := 0;
    for rec in
      select * from (values
        ('Panel surface inspected', 'Check for cracks before cleaning.', false),
        ('Deionized water rinse complete', NULL, true),
        ('Frame + edges wiped', NULL, false),
        ('After photos', 'Show the panels under sun if possible.', true)
      ) as t(label, hint, requires_photo)
    loop
      v_idx := v_idx + 1;
      insert into public.service_checklist_items (service_id, sort_order, label, hint, requires_photo)
      select v_service_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.service_checklist_items
        where service_id = v_service_id and label = rec.label
      );
    end loop;
  end if;

  -- ===========================================================
  -- BIG RIG
  -- ===========================================================

  -- Rig Rinse
  select id into v_service_id from public.services
    where category = 'big_rig' and tier_name = 'Rig Rinse' limit 1;
  if v_service_id is not null then
    v_idx := 0;
    for rec in
      select * from (values
        ('Foam wash applied (cab + trailer)', NULL, false),
        ('Cab + trailer rinsed', NULL, true),
        ('Wheels and mud flaps cleaned', NULL, false),
        ('Windows cleaned', NULL, false),
        ('Final walk-around', NULL, false),
        ('After photos', 'Both sides + rear.', true)
      ) as t(label, hint, requires_photo)
    loop
      v_idx := v_idx + 1;
      insert into public.service_checklist_items (service_id, sort_order, label, hint, requires_photo)
      select v_service_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.service_checklist_items
        where service_id = v_service_id and label = rec.label
      );
    end loop;
  end if;

  -- Trailer Wash
  select id into v_service_id from public.services
    where category = 'big_rig' and tier_name = 'Trailer Wash' limit 1;
  if v_service_id is not null then
    v_idx := 0;
    for rec in
      select * from (values
        ('Foam wash applied (cab + trailer)', NULL, false),
        ('Cab + trailer rinsed', NULL, true),
        ('Chrome polished', NULL, true),
        ('Wheels + mud flaps cleaned', NULL, false),
        ('Tires dressed', NULL, false),
        ('Fender detail', NULL, false),
        ('Windows cleaned', NULL, false),
        ('After photos', 'Both sides + rear.', true)
      ) as t(label, hint, requires_photo)
    loop
      v_idx := v_idx + 1;
      insert into public.service_checklist_items (service_id, sort_order, label, hint, requires_photo)
      select v_service_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.service_checklist_items
        where service_id = v_service_id and label = rec.label
      );
    end loop;
  end if;

  -- Full Rig Detail
  select id into v_service_id from public.services
    where category = 'big_rig' and tier_name = 'Full Rig Detail' limit 1;
  if v_service_id is not null then
    v_idx := 0;
    for rec in
      select * from (values
        ('Full exterior wash + chrome polish', NULL, true),
        ('Wheels, tires, fenders detailed', NULL, false),
        ('Cab interior vacuumed', NULL, true),
        ('Sleeper vacuumed (if applicable)', NULL, false),
        ('Leather conditioned', NULL, false),
        ('Dashboard + controls wiped', NULL, false),
        ('Glass cleaned (in + out)', NULL, false),
        ('Final walk-around with driver', NULL, false),
        ('After photos', 'Exterior + interior.', true)
      ) as t(label, hint, requires_photo)
    loop
      v_idx := v_idx + 1;
      insert into public.service_checklist_items (service_id, sort_order, label, hint, requires_photo)
      select v_service_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.service_checklist_items
        where service_id = v_service_id and label = rec.label
      );
    end loop;
  end if;

  -- Showroom Rig
  select id into v_service_id from public.services
    where category = 'big_rig' and tier_name = 'Showroom Rig' limit 1;
  if v_service_id is not null then
    v_idx := 0;
    for rec in
      select * from (values
        ('Full exterior wash + chrome polish', NULL, true),
        ('Paint correction (cab + trailer)', NULL, true),
        ('Ceramic top-up', NULL, true),
        ('Cab interior deep clean', NULL, true),
        ('Sleeper vacuumed + wiped', NULL, false),
        ('Leather conditioned', NULL, false),
        ('Glass treated', NULL, false),
        ('Wheels + tires finished', NULL, false),
        ('Final walk-around with driver', NULL, false),
        ('After photos', 'Concours-grade shots.', true)
      ) as t(label, hint, requires_photo)
    loop
      v_idx := v_idx + 1;
      insert into public.service_checklist_items (service_id, sort_order, label, hint, requires_photo)
      select v_service_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.service_checklist_items
        where service_id = v_service_id and label = rec.label
      );
    end loop;
  end if;
end $$;

-- =============================================================
-- Fix service_checklist_items seed: migration 0018 used wrong
-- tier_name values ('Express', 'Premium') which don't match the
-- actual services rows ('Express Wash', 'Premium Detail').
-- This migration inserts the missing items idempotently.
-- =============================================================

do $$
declare
  v_service_id uuid;
  v_idx int;
  rec record;
begin
  -- ===========================================================
  -- AUTO — Express Wash
  -- ===========================================================
  select id into v_service_id from public.services
    where category = 'auto' and tier_name = 'Express Wash' limit 1;
  if v_service_id is not null then
    v_idx := 0;
    for rec in
      select * from (values
        ('Foam pre-soak applied',            'Cover the whole vehicle, let it dwell 3–5 min.',       false),
        ('Two-bucket hand wash complete',    'Wash + rinse buckets, fresh microfiber per panel.',    false),
        ('Wheels & tires cleaned',           'Iron remover on wheels, tire cleaner on rubber.',      false),
        ('Door jambs wiped down',            'Top, bottom, and latch area.',                         false),
        ('Windows cleaned (in + out)',       NULL,                                                   false),
        ('Tire shine applied',               NULL,                                                   false),
        ('Final walk-around',                'Spot-check for missed water, streaks, swirl marks.',   false),
        ('After photo',                      'At least one wide shot of the finished car.',           true)
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
  -- AUTO — Full Detail
  -- ===========================================================
  select id into v_service_id from public.services
    where category = 'auto' and tier_name = 'Full Detail' limit 1;
  if v_service_id is not null then
    v_idx := 0;
    for rec in
      select * from (values
        ('Foam pre-soak applied',                    NULL,                                                    false),
        ('Two-bucket hand wash complete',            NULL,                                                    false),
        ('Wheels, tires & arches cleaned',           NULL,                                                    false),
        ('Door jambs + sills wiped',                 NULL,                                                    false),
        ('Interior vacuum — seats, carpet, mats',    'Lift mats, vacuum under them.',                         true),
        ('Dashboard + console wiped',                NULL,                                                    false),
        ('Cup holders + air vents detailed',         NULL,                                                    false),
        ('Windows cleaned (in + out)',               NULL,                                                    false),
        ('Tire shine + trim dressing',               NULL,                                                    false),
        ('Final walk-around',                        NULL,                                                    false),
        ('After photo',                              'Exterior + interior shots.',                             true)
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
  -- AUTO — Premium Detail
  -- ===========================================================
  select id into v_service_id from public.services
    where category = 'auto' and tier_name = 'Premium Detail' limit 1;
  if v_service_id is not null then
    v_idx := 0;
    for rec in
      select * from (values
        ('Foam pre-soak applied',                    NULL,                                                    false),
        ('Two-bucket hand wash complete',            NULL,                                                    false),
        ('Wheels, tires & arches cleaned',           NULL,                                                    false),
        ('Clay bar treatment',                       'Whole car, panel by panel — photograph the bar.',       true),
        ('Hand wax / sealant applied',               NULL,                                                    false),
        ('Interior vacuum + steam clean',            NULL,                                                    true),
        ('Leather conditioned',                      NULL,                                                    false),
        ('Trim dressed',                             NULL,                                                    false),
        ('Windows cleaned (in + out)',               NULL,                                                    false),
        ('Tire shine + arch dressing',               NULL,                                                    false),
        ('Final walk-around',                        NULL,                                                    false),
        ('After photo',                              'Wide + detail shots that show the gloss.',              true)
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
  -- AUTO — Showroom
  -- ===========================================================
  select id into v_service_id from public.services
    where category = 'auto' and tier_name = 'Showroom' limit 1;
  if v_service_id is not null then
    v_idx := 0;
    for rec in
      select * from (values
        ('Two-bucket hand wash complete',            NULL,                                                    false),
        ('Clay bar treatment',                       NULL,                                                    true),
        ('Paint correction — compound + polish',     'Photo the swirl test area before + after.',             true),
        ('Ceramic top-up applied',                   NULL,                                                    true),
        ('Engine bay detail',                        NULL,                                                    true),
        ('Interior deep clean — steam + vacuum',     NULL,                                                    true),
        ('Leather conditioned',                      NULL,                                                    false),
        ('Trim restored / dressed',                  NULL,                                                    false),
        ('Glass treated',                            NULL,                                                    false),
        ('Wheels + tires finished',                  NULL,                                                    false),
        ('Final walk-around with customer',          'Walk them through every panel.',                        false),
        ('After photo',                              'Concours-grade shots — wide + close detail.',           true)
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
  -- HOME — Driveway & Walkway
  -- ===========================================================
  select id into v_service_id from public.services
    where category = 'home' and tier_name = 'Driveway & Walkway' limit 1;
  if v_service_id is not null then
    v_idx := 0;
    for rec in
      select * from (values
        ('Pre-treatment on oil + stains',    'Spot-treat before the main wash.',                      true),
        ('Pressure wash — full surface',     'Cover all areas, overlap passes.',                      true),
        ('Edges and curb cleaned',           NULL,                                                    false),
        ('Final rinse',                      NULL,                                                    false),
        ('After photo',                      'Wide before/after showing the difference.',             true)
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
  -- HOME — Full Exterior
  -- ===========================================================
  select id into v_service_id from public.services
    where category = 'home' and tier_name = 'Full Exterior' limit 1;
  if v_service_id is not null then
    v_idx := 0;
    for rec in
      select * from (values
        ('Driveway + walkways pressure washed',      NULL,                                                    true),
        ('Soft-wash siding complete',                'Low-pressure biodegradable cleaner.',                  true),
        ('Eaves and fascia cleaned',                 NULL,                                                    false),
        ('Windows rinsed',                           NULL,                                                    false),
        ('Final rinse',                              NULL,                                                    false),
        ('After photo',                              'Wide shots showing full before/after difference.',     true)
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
  -- HOME — Deck/Patio Add-on
  -- ===========================================================
  select id into v_service_id from public.services
    where category = 'home' and tier_name = 'Deck/Patio Add-on' limit 1;
  if v_service_id is not null then
    v_idx := 0;
    for rec in
      select * from (values
        ('pH-balanced deck cleaner applied', 'Deck-safe formula only.',                              false),
        ('Deck or patio fully washed',       NULL,                                                    true),
        ('Furniture moved + replaced',       NULL,                                                    false),
        ('Final rinse',                      NULL,                                                    false),
        ('After photo',                      NULL,                                                    true)
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
  -- HOME — Solar Panel Wash
  -- ===========================================================
  select id into v_service_id from public.services
    where category = 'home' and tier_name = 'Solar Panel Wash' limit 1;
  if v_service_id is not null then
    v_idx := 0;
    for rec in
      select * from (values
        ('Panels inspected before cleaning',         'Check each panel for cracks — stop and report any.',   false),
        ('Deionized water rinse complete',           NULL,                                                    true),
        ('Frame + edges wiped',                      NULL,                                                    false),
        ('After photo',                              'Show the panels under direct sun if possible.',         true)
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
  -- BIG RIG — Rig Rinse (names already matched in 0018, kept for
  -- idempotency in case DB was reset)
  -- ===========================================================
  select id into v_service_id from public.services
    where category = 'big_rig' and tier_name = 'Rig Rinse' limit 1;
  if v_service_id is not null then
    v_idx := 0;
    for rec in
      select * from (values
        ('Foam wash applied — cab + trailer',        NULL,                                                    false),
        ('Cab + trailer rinsed',                     NULL,                                                    true),
        ('Wheels and mud flaps cleaned',             NULL,                                                    false),
        ('Windows cleaned',                          NULL,                                                    false),
        ('Final walk-around',                        NULL,                                                    false),
        ('After photo',                              'Both sides + rear of the rig.',                         true)
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
  -- BIG RIG — Trailer Wash
  -- ===========================================================
  select id into v_service_id from public.services
    where category = 'big_rig' and tier_name = 'Trailer Wash' limit 1;
  if v_service_id is not null then
    v_idx := 0;
    for rec in
      select * from (values
        ('Foam wash applied — cab + trailer',        NULL,                                                    false),
        ('Cab + trailer rinsed',                     NULL,                                                    true),
        ('Chrome polished',                          NULL,                                                    true),
        ('Wheels + mud flaps cleaned',               NULL,                                                    false),
        ('Tires dressed',                            NULL,                                                    false),
        ('Fender detail',                            NULL,                                                    false),
        ('Windows cleaned',                          NULL,                                                    false),
        ('After photo',                              'Both sides + rear of the rig.',                         true)
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
  -- BIG RIG — Full Rig Detail
  -- ===========================================================
  select id into v_service_id from public.services
    where category = 'big_rig' and tier_name = 'Full Rig Detail' limit 1;
  if v_service_id is not null then
    v_idx := 0;
    for rec in
      select * from (values
        ('Full exterior wash + chrome polish',       NULL,                                                    true),
        ('Wheels, tires & fenders detailed',         NULL,                                                    false),
        ('Cab interior vacuumed',                    NULL,                                                    true),
        ('Sleeper vacuumed (if applicable)',         NULL,                                                    false),
        ('Leather conditioned',                      NULL,                                                    false),
        ('Dashboard + controls wiped',               NULL,                                                    false),
        ('Glass cleaned (in + out)',                 NULL,                                                    false),
        ('Final walk-around with driver',            NULL,                                                    false),
        ('After photo',                              'Exterior + interior.',                                  true)
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
  -- BIG RIG — Showroom Rig
  -- ===========================================================
  select id into v_service_id from public.services
    where category = 'big_rig' and tier_name = 'Showroom Rig' limit 1;
  if v_service_id is not null then
    v_idx := 0;
    for rec in
      select * from (values
        ('Full exterior wash + chrome polish',       NULL,                                                    true),
        ('Paint correction — cab + trailer',         NULL,                                                    true),
        ('Ceramic top-up applied',                   NULL,                                                    true),
        ('Cab interior deep clean',                  NULL,                                                    true),
        ('Sleeper vacuumed + wiped',                 NULL,                                                    false),
        ('Leather conditioned',                      NULL,                                                    false),
        ('Glass treated',                            NULL,                                                    false),
        ('Wheels + tires finished',                  NULL,                                                    false),
        ('Final walk-around with driver',            NULL,                                                    false),
        ('After photo',                              'Concours-grade shots — wide + close detail.',           true)
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

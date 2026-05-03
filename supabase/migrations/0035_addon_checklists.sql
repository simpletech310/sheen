-- =============================================================
-- Per-addon QA checklists.
--
-- Each addon a customer ticks at booking adds its own list of
-- proof-of-work items the washer must check off before /complete
-- will accept the job. Same shape as service_checklist_items
-- (label, hint, requires_photo) so the UI can render them in one
-- mixed list grouped by addon name.
--
-- Storage of progress: bookings.checklist_progress JSONB stays the
-- single source. Item IDs are uuids and won't collide between the
-- two checklist tables, so the same `{ "<item_id>": { done_at, photo_path } }`
-- structure works for both kinds.
-- =============================================================

create table if not exists public.addon_checklist_items (
  id uuid primary key default gen_random_uuid(),
  addon_id uuid not null references public.service_addons(id) on delete cascade,
  sort_order int not null default 0,
  label text not null,
  hint text,
  requires_photo boolean not null default false,
  created_at timestamptz default now()
);

create index if not exists addon_checklist_addon_idx
  on public.addon_checklist_items (addon_id, sort_order);

alter table public.addon_checklist_items enable row level security;

-- Public read — same as service_checklist_items. Customers preview
-- "what your pro will do" on the tracking page; pros check items off.
drop policy if exists "addon checklist public read" on public.addon_checklist_items;
create policy "addon checklist public read"
  on public.addon_checklist_items
  for select using (true);

-- Writes via service role only (admin / catalog updates).


-- =============================================================
-- Seed checklists per addon. Idempotent — keyed off
-- (addon.code, label) so re-running is safe.
-- =============================================================

do $$
declare
  v_addon_id uuid;
  v_idx int;
  rec record;
begin
  -- Helper: resolve an addon code to its row, then upsert checklist items.
  -- Wrapped per-addon below to keep the seed readable.

  -- ============ AUTO ============

  -- tire_shine_plus
  select id into v_addon_id from public.service_addons where code = 'tire_shine_plus';
  if v_addon_id is not null then
    v_idx := 0;
    for rec in select * from (values
      ('Tires cleaned of brake dust', 'Spray + scrub before dressing.', false),
      ('Premium dressing applied (all 4 tires)', NULL, false),
      ('Sidewall photo (post-dressing)', 'Show the wet-look finish.', true)
    ) as t(label, hint, requires_photo) loop
      v_idx := v_idx + 1;
      insert into public.addon_checklist_items (addon_id, sort_order, label, hint, requires_photo)
      select v_addon_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.addon_checklist_items where addon_id = v_addon_id and label = rec.label
      );
    end loop;
  end if;

  -- pet_hair
  select id into v_addon_id from public.service_addons where code = 'pet_hair';
  if v_addon_id is not null then
    v_idx := 0;
    for rec in select * from (values
      ('Rubber-brush pass on seats', 'Front + back row.', false),
      ('Rubber-brush pass on carpet + mats', NULL, false),
      ('Vacuum extraction complete', 'Lift mats, vacuum under.', false),
      ('Photo: seats + carpet (post-extraction)', NULL, true)
    ) as t(label, hint, requires_photo) loop
      v_idx := v_idx + 1;
      insert into public.addon_checklist_items (addon_id, sort_order, label, hint, requires_photo)
      select v_addon_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.addon_checklist_items where addon_id = v_addon_id and label = rec.label
      );
    end loop;
  end if;

  -- hand_wax
  select id into v_addon_id from public.service_addons where code = 'hand_wax';
  if v_addon_id is not null then
    v_idx := 0;
    for rec in select * from (values
      ('Surface clean + dry before wax', NULL, false),
      ('Carnauba wax applied panel-by-panel', 'Use applicator pad, thin layer.', false),
      ('Wax buffed off with microfiber', 'Two-towel method.', false),
      ('Photo: hood reflection (post-wax)', 'Show the gloss.', true)
    ) as t(label, hint, requires_photo) loop
      v_idx := v_idx + 1;
      insert into public.addon_checklist_items (addon_id, sort_order, label, hint, requires_photo)
      select v_addon_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.addon_checklist_items where addon_id = v_addon_id and label = rec.label
      );
    end loop;
  end if;

  -- bug_tar_removal
  select id into v_addon_id from public.service_addons where code = 'bug_tar_removal';
  if v_addon_id is not null then
    v_idx := 0;
    for rec in select * from (values
      ('Bug-tar remover applied (front bumper + grille + mirrors)', 'Dwell time per product spec.', false),
      ('Agitated + wiped clean', NULL, false),
      ('Final rinse', NULL, false),
      ('Photo: front-end clean', NULL, true)
    ) as t(label, hint, requires_photo) loop
      v_idx := v_idx + 1;
      insert into public.addon_checklist_items (addon_id, sort_order, label, hint, requires_photo)
      select v_addon_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.addon_checklist_items where addon_id = v_addon_id and label = rec.label
      );
    end loop;
  end if;

  -- leather_treatment
  select id into v_addon_id from public.service_addons where code = 'leather_treatment';
  if v_addon_id is not null then
    v_idx := 0;
    for rec in select * from (values
      ('Leather cleaned (all seats + console + door panels)', NULL, false),
      ('Conditioner applied + worked in', 'Use leather brush or pad.', false),
      ('Excess wiped off', 'Surfaces should not be sticky.', false),
      ('Photo: front seats post-treatment', NULL, true)
    ) as t(label, hint, requires_photo) loop
      v_idx := v_idx + 1;
      insert into public.addon_checklist_items (addon_id, sort_order, label, hint, requires_photo)
      select v_addon_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.addon_checklist_items where addon_id = v_addon_id and label = rec.label
      );
    end loop;
  end if;

  -- engine_bay
  select id into v_addon_id from public.service_addons where code = 'engine_bay';
  if v_addon_id is not null then
    v_idx := 0;
    for rec in select * from (values
      ('Sensitive electronics covered/protected', 'Plastic bagging if needed.', true),
      ('Degreaser applied + dwelled', NULL, false),
      ('Agitated and rinsed', 'Low pressure, no direct stream on alternator.', false),
      ('Plastics + hoses dressed', NULL, false),
      ('Photo: engine bay (post-detail)', NULL, true)
    ) as t(label, hint, requires_photo) loop
      v_idx := v_idx + 1;
      insert into public.addon_checklist_items (addon_id, sort_order, label, hint, requires_photo)
      select v_addon_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.addon_checklist_items where addon_id = v_addon_id and label = rec.label
      );
    end loop;
  end if;

  -- clay_bar
  select id into v_addon_id from public.service_addons where code = 'clay_bar';
  if v_addon_id is not null then
    v_idx := 0;
    for rec in select * from (values
      ('Wash + rinse complete (paint must be clean)', NULL, false),
      ('Clay lubricant applied per panel', 'Keep surface wet at all times.', false),
      ('Clay bar passed over every panel', 'Show the bar contamination.', true),
      ('Surface wiped + dried', NULL, false),
      ('Photo: contaminated bar (proof of work)', NULL, true)
    ) as t(label, hint, requires_photo) loop
      v_idx := v_idx + 1;
      insert into public.addon_checklist_items (addon_id, sort_order, label, hint, requires_photo)
      select v_addon_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.addon_checklist_items where addon_id = v_addon_id and label = rec.label
      );
    end loop;
  end if;

  -- headlight_restore
  select id into v_addon_id from public.service_addons where code = 'headlight_restore';
  if v_addon_id is not null then
    v_idx := 0;
    for rec in select * from (values
      ('Photo: BEFORE (both headlights)', 'Required — proves the haze.', true),
      ('Tape off surrounding paint', NULL, false),
      ('Wet-sand through grits (start coarse, end fine)', NULL, false),
      ('Polish to clarity', NULL, false),
      ('UV sealant applied', 'So they don''t haze again in 3 months.', false),
      ('Photo: AFTER (both headlights)', NULL, true)
    ) as t(label, hint, requires_photo) loop
      v_idx := v_idx + 1;
      insert into public.addon_checklist_items (addon_id, sort_order, label, hint, requires_photo)
      select v_addon_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.addon_checklist_items where addon_id = v_addon_id and label = rec.label
      );
    end loop;
  end if;

  -- interior_shampoo
  select id into v_addon_id from public.service_addons where code = 'interior_shampoo';
  if v_addon_id is not null then
    v_idx := 0;
    for rec in select * from (values
      ('Vacuum complete (under mats too)', NULL, false),
      ('Pre-treatment on stains', NULL, false),
      ('Shampoo applied (carpet + mats + cloth seats)', NULL, false),
      ('Hot-water extraction pass', 'Until water comes back clear.', true),
      ('Surfaces left damp, not soaked', NULL, false),
      ('Photo: extracted carpet (post-shampoo)', NULL, true)
    ) as t(label, hint, requires_photo) loop
      v_idx := v_idx + 1;
      insert into public.addon_checklist_items (addon_id, sort_order, label, hint, requires_photo)
      select v_addon_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.addon_checklist_items where addon_id = v_addon_id and label = rec.label
      );
    end loop;
  end if;

  -- ozone_treatment
  select id into v_addon_id from public.service_addons where code = 'ozone_treatment';
  if v_addon_id is not null then
    v_idx := 0;
    for rec in select * from (values
      ('Interior cleaned + dry before ozone', 'Ozone fixes odor, not dirt.', false),
      ('Vehicle sealed (windows + sunroof closed)', NULL, false),
      ('Ozone generator placed + run for full cycle', 'Min 60 min.', true),
      ('Vehicle aired out before handover', '15 min minimum, windows down.', false),
      ('Photo: ozone unit running (timestamped)', NULL, true)
    ) as t(label, hint, requires_photo) loop
      v_idx := v_idx + 1;
      insert into public.addon_checklist_items (addon_id, sort_order, label, hint, requires_photo)
      select v_addon_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.addon_checklist_items where addon_id = v_addon_id and label = rec.label
      );
    end loop;
  end if;

  -- ceramic_seal
  select id into v_addon_id from public.service_addons where code = 'ceramic_seal';
  if v_addon_id is not null then
    v_idx := 0;
    for rec in select * from (values
      ('Surface decontaminated (clay or chemical)', 'Ceramic only bonds to clean paint.', false),
      ('Surface temperature checked (in spec)', NULL, false),
      ('SiO2 sealant applied panel by panel', 'Cross-hatch with applicator pad.', false),
      ('Buffed to high gloss', NULL, false),
      ('Cure time noted (no water for 4 hours)', 'Tell the customer.', false),
      ('Photo: water beading test', 'Mist + show beading.', true)
    ) as t(label, hint, requires_photo) loop
      v_idx := v_idx + 1;
      insert into public.addon_checklist_items (addon_id, sort_order, label, hint, requires_photo)
      select v_addon_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.addon_checklist_items where addon_id = v_addon_id and label = rec.label
      );
    end loop;
  end if;

  -- paint_correction
  select id into v_addon_id from public.service_addons where code = 'paint_correction';
  if v_addon_id is not null then
    v_idx := 0;
    for rec in select * from (values
      ('Photo: BEFORE under inspection light', 'Show swirl marks + defects.', true),
      ('Wash + clay-bar decontamination complete', NULL, false),
      ('Test panel — confirm correction works', 'Adjust pad/compound if not.', true),
      ('Compound stage on every panel', 'DA polisher, slow passes.', false),
      ('Polish stage to remove compound haze', NULL, false),
      ('IPA wipe-down (reveals true correction)', NULL, false),
      ('Photo: AFTER under inspection light', NULL, true)
    ) as t(label, hint, requires_photo) loop
      v_idx := v_idx + 1;
      insert into public.addon_checklist_items (addon_id, sort_order, label, hint, requires_photo)
      select v_addon_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.addon_checklist_items where addon_id = v_addon_id and label = rec.label
      );
    end loop;
  end if;

  -- ceramic_pro
  select id into v_addon_id from public.service_addons where code = 'ceramic_pro';
  if v_addon_id is not null then
    v_idx := 0;
    for rec in select * from (values
      ('Paint correction complete (1+ steps)', 'Coating locks in defects — must be fixed first.', true),
      ('IPA wipe-down (removes polish residue)', NULL, false),
      ('Surface temp + humidity in spec', NULL, false),
      ('Ceramic coating applied panel by panel', 'Cross-hatch, 30-60s flash.', true),
      ('High-spot leveling pass with microfiber', NULL, false),
      ('24-hour no-touch instructions given to customer', 'Don''t drive in rain for 48h.', false),
      ('Warranty docs filed with admin', NULL, false),
      ('Photo: water beading + finished panels', NULL, true)
    ) as t(label, hint, requires_photo) loop
      v_idx := v_idx + 1;
      insert into public.addon_checklist_items (addon_id, sort_order, label, hint, requires_photo)
      select v_addon_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.addon_checklist_items where addon_id = v_addon_id and label = rec.label
      );
    end loop;
  end if;

  -- ============ BIG RIG ============

  -- bug_tar_rig
  select id into v_addon_id from public.service_addons where code = 'bug_tar_rig';
  if v_addon_id is not null then
    v_idx := 0;
    for rec in select * from (values
      ('Bug-tar remover applied (cab front + grille + bumper)', NULL, false),
      ('Agitated + wiped', NULL, false),
      ('Rinsed', NULL, false),
      ('Photo: front-end clean', NULL, true)
    ) as t(label, hint, requires_photo) loop
      v_idx := v_idx + 1;
      insert into public.addon_checklist_items (addon_id, sort_order, label, hint, requires_photo)
      select v_addon_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.addon_checklist_items where addon_id = v_addon_id and label = rec.label
      );
    end loop;
  end if;

  -- degrease_undercarriage
  select id into v_addon_id from public.service_addons where code = 'degrease_undercarriage';
  if v_addon_id is not null then
    v_idx := 0;
    for rec in select * from (values
      ('Degreaser applied to frame, tanks, fifth wheel', NULL, false),
      ('Dwell time observed', NULL, false),
      ('High-pressure rinse complete', NULL, true),
      ('Photo: undercarriage (post-rinse)', NULL, true)
    ) as t(label, hint, requires_photo) loop
      v_idx := v_idx + 1;
      insert into public.addon_checklist_items (addon_id, sort_order, label, hint, requires_photo)
      select v_addon_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.addon_checklist_items where addon_id = v_addon_id and label = rec.label
      );
    end loop;
  end if;

  -- cab_shampoo
  select id into v_addon_id from public.service_addons where code = 'cab_shampoo';
  if v_addon_id is not null then
    v_idx := 0;
    for rec in select * from (values
      ('Cab vacuumed before shampoo', NULL, false),
      ('Pre-treatment on stains', NULL, false),
      ('Shampoo applied to carpets + mats + seats', NULL, false),
      ('Hot-water extraction pass', NULL, true),
      ('Photo: cab interior post-extraction', NULL, true)
    ) as t(label, hint, requires_photo) loop
      v_idx := v_idx + 1;
      insert into public.addon_checklist_items (addon_id, sort_order, label, hint, requires_photo)
      select v_addon_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.addon_checklist_items where addon_id = v_addon_id and label = rec.label
      );
    end loop;
  end if;

  -- aluminum_wheel_polish
  select id into v_addon_id from public.service_addons where code = 'aluminum_wheel_polish';
  if v_addon_id is not null then
    v_idx := 0;
    for rec in select * from (values
      ('Wheels cleaned + dried', NULL, false),
      ('Cutting compound applied (every wheel)', NULL, false),
      ('Polish stage to mirror finish', NULL, false),
      ('Sealant applied', 'Slows oxidation between washes.', false),
      ('Photo: polished wheel (close-up)', NULL, true)
    ) as t(label, hint, requires_photo) loop
      v_idx := v_idx + 1;
      insert into public.addon_checklist_items (addon_id, sort_order, label, hint, requires_photo)
      select v_addon_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.addon_checklist_items where addon_id = v_addon_id and label = rec.label
      );
    end loop;
  end if;

  -- sleeper_deep_clean
  select id into v_addon_id from public.service_addons where code = 'sleeper_deep_clean';
  if v_addon_id is not null then
    v_idx := 0;
    for rec in select * from (values
      ('Bedding removed + surfaces fully exposed', 'Driver should consent ahead.', false),
      ('Full vacuum (corners, vents, under bunk)', NULL, false),
      ('Surfaces wiped + sanitized', NULL, false),
      ('Microwave + fridge cleaned (if applicable)', NULL, false),
      ('Photo: sleeper post-clean', NULL, true)
    ) as t(label, hint, requires_photo) loop
      v_idx := v_idx + 1;
      insert into public.addon_checklist_items (addon_id, sort_order, label, hint, requires_photo)
      select v_addon_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.addon_checklist_items where addon_id = v_addon_id and label = rec.label
      );
    end loop;
  end if;

  -- chrome_polish_premium
  select id into v_addon_id from public.service_addons where code = 'chrome_polish_premium';
  if v_addon_id is not null then
    v_idx := 0;
    for rec in select * from (values
      ('Acid wash on stacks + tanks (if oxidized)', 'Mask non-chrome surfaces.', false),
      ('Cutting compound applied + worked', NULL, false),
      ('Polish stage to mirror', NULL, false),
      ('Sealant applied to all chrome', NULL, false),
      ('Photo: stack reflection (close-up)', NULL, true)
    ) as t(label, hint, requires_photo) loop
      v_idx := v_idx + 1;
      insert into public.addon_checklist_items (addon_id, sort_order, label, hint, requires_photo)
      select v_addon_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.addon_checklist_items where addon_id = v_addon_id and label = rec.label
      );
    end loop;
  end if;

  -- ceramic_seal_rig
  select id into v_addon_id from public.service_addons where code = 'ceramic_seal_rig';
  if v_addon_id is not null then
    v_idx := 0;
    for rec in select * from (values
      ('Cab + trailer washed + dried', NULL, false),
      ('Surface temp checked', NULL, false),
      ('SiO2 sealant applied — cab', NULL, false),
      ('SiO2 sealant applied — trailer', NULL, false),
      ('Buffed to gloss', NULL, false),
      ('Photo: beading test on cab + trailer', NULL, true)
    ) as t(label, hint, requires_photo) loop
      v_idx := v_idx + 1;
      insert into public.addon_checklist_items (addon_id, sort_order, label, hint, requires_photo)
      select v_addon_id, v_idx, rec.label, rec.hint, rec.requires_photo
      where not exists (
        select 1 from public.addon_checklist_items where addon_id = v_addon_id and label = rec.label
      );
    end loop;
  end if;

end $$;

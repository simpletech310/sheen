-- =============================================================
-- Washer documents (insurance) storage bucket + tightened
-- background-check status. Pairs with the new /pro/verify flow
-- and /api/pro/insurance + /api/pro/background-check endpoints.
-- =============================================================

-- 1. Private storage bucket for washer documents (insurance certs etc.).
--    Private — only the owner + admin can read.
insert into storage.buckets (id, name, public)
values ('washer-documents', 'washer-documents', false)
on conflict (id) do nothing;

-- Path convention: <user_id>/<uuid>.<ext>
-- (single segment user folder; foldername(name)[1] = user_id)

drop policy if exists "washer-docs read own"   on storage.objects;
drop policy if exists "washer-docs write own"  on storage.objects;
drop policy if exists "washer-docs update own" on storage.objects;
drop policy if exists "washer-docs delete own" on storage.objects;
drop policy if exists "washer-docs admin read" on storage.objects;

create policy "washer-docs read own"
  on storage.objects for select
  using (
    bucket_id = 'washer-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "washer-docs write own"
  on storage.objects for insert
  with check (
    bucket_id = 'washer-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "washer-docs update own"
  on storage.objects for update
  using (
    bucket_id = 'washer-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'washer-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "washer-docs delete own"
  on storage.objects for delete
  using (
    bucket_id = 'washer-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "washer-docs admin read"
  on storage.objects for select
  using (
    bucket_id = 'washer-documents'
    and public.is_admin(auth.uid())
  );

-- 2. Background-check status: tighten the allowed values.
--    Existing default is 'pending'; we want 'not_submitted' so
--    fresh washers don't appear to already be in review.
do $$ begin
  alter table public.washer_profiles
    alter column background_check_status set default 'not_submitted';
exception when others then null; end $$;

-- Backfill any rows that came in with the old 'pending' default but
-- were never actually submitted (heuristic: no audit_log row).
update public.washer_profiles
set background_check_status = 'not_submitted'
where background_check_status = 'pending'
  and not exists (
    select 1 from public.audit_log
    where action = 'washer.bgcheck_requested'
      and target_id = washer_profiles.user_id
  );

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'washer_bgcheck_status_chk'
  ) then
    alter table public.washer_profiles
      add constraint washer_bgcheck_status_chk
      check (background_check_status in ('not_submitted','pending','verified','denied'));
  end if;
end $$;

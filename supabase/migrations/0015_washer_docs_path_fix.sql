-- Fix washer-documents storage policies to match the existing
-- /api/upload path convention: <scope>/<user_id>/<uuid>.<ext>
-- (the index is [2] for the user_id folder, not [1]).

drop policy if exists "washer-docs read own"   on storage.objects;
drop policy if exists "washer-docs write own"  on storage.objects;
drop policy if exists "washer-docs update own" on storage.objects;
drop policy if exists "washer-docs delete own" on storage.objects;
drop policy if exists "washer-docs admin read" on storage.objects;

create policy "washer-docs read own"
  on storage.objects for select
  using (
    bucket_id = 'washer-documents'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "washer-docs write own"
  on storage.objects for insert
  with check (
    bucket_id = 'washer-documents'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "washer-docs update own"
  on storage.objects for update
  using (
    bucket_id = 'washer-documents'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'washer-documents'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "washer-docs delete own"
  on storage.objects for delete
  using (
    bucket_id = 'washer-documents'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "washer-docs admin read"
  on storage.objects for select
  using (
    bucket_id = 'washer-documents'
    and public.is_admin(auth.uid())
  );

-- Two fixes:
--   1. Storage RLS policies were missing entirely, so every authenticated
--      upload was rejected with "new row violates row-level security policy".
--   2. Vehicles had no photo storage column, and the garage UI couldn't
--      attach photos. Add vehicles.photo_paths and policies so the pro
--      sees the customer's car ahead of any specific booking.

-- =============================================================
-- 1. Per-vehicle photo paths (what the car looks like).
-- =============================================================
alter table public.vehicles
  add column if not exists photo_paths text[] not null default '{}';

-- =============================================================
-- 2. Storage policies on storage.objects.
--    Path convention enforced by /api/upload:
--      booking-photos/<scope>/<user_id>/<uuid>.<ext>
--      insurance-docs/<scope>/<user_id>/<uuid>.<ext>
--      partner-portfolio/<scope>/<user_id>/<uuid>.<ext>
--      claim-evidence/<scope>/<user_id>/<uuid>.<ext>
--    storage.foldername(name) returns the path segments as a text[].
--    Segment indexing is 1-based; segment 2 is the user_id folder we
--    want to authorize against auth.uid().
-- =============================================================

-- Authenticated users can upload to a folder owned by their user_id.
drop policy if exists "Authenticated users can upload to own folder" on storage.objects;
create policy "Authenticated users can upload to own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('booking-photos', 'insurance-docs', 'partner-portfolio', 'claim-evidence')
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Owner can read and delete their own objects in any of the above buckets.
drop policy if exists "Owners can read own objects" on storage.objects;
create policy "Owners can read own objects"
  on storage.objects for select
  to authenticated
  using (
    bucket_id in ('booking-photos', 'insurance-docs', 'partner-portfolio', 'claim-evidence')
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "Owners can delete own objects" on storage.objects;
create policy "Owners can delete own objects"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('booking-photos', 'insurance-docs', 'partner-portfolio', 'claim-evidence')
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Public buckets allow anonymous reads — needed so signed URLs aren't
-- required for casual public displays. The "Owners can read own objects"
-- policy above still lets owners read anything they uploaded; this one
-- adds a public-read fallback for buckets explicitly marked public.
drop policy if exists "Public buckets are readable" on storage.objects;
create policy "Public buckets are readable"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id in ('booking-photos', 'partner-portfolio')
  );

-- Service role / admin: read everything for moderation + signed URLs.
drop policy if exists "Service role full access" on storage.objects;
create policy "Service role full access"
  on storage.objects for all
  to service_role
  using (true)
  with check (true);

-- Admins (via is_admin) can read every object — useful for the moderation
-- queue and damage claim review flow.
drop policy if exists "Admin can read all objects" on storage.objects;
create policy "Admin can read all objects"
  on storage.objects for select
  to authenticated
  using (public.is_admin(auth.uid()));

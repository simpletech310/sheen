-- Add a list of city names a washer is willing to take jobs in. The
-- existing radius-from-base setup works for "stay within 5 miles of my
-- house" — but a pro who lives in Riverside and drives down to LA on
-- weekends needs to swap their preferred service zone day-to-day. This
-- column is the override: when non-empty, the queue only surfaces jobs
-- whose address city is in this list (case-insensitive). Empty/null
-- means "fall back to radius-from-base", same as before.

alter table public.washer_profiles
  add column if not exists service_areas text[] not null default '{}';

-- Cheap GIN index — looked up on every queue render.
create index if not exists washer_profiles_service_areas_idx
  on public.washer_profiles using gin (service_areas);

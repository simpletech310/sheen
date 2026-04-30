-- Direct washer requests + customer self-service (cancel, reschedule,
-- loyalty redemption, profile edits).

-- =============================================================
-- 1. Wash handle — washer's shareable code so customers can request them.
--    Short, uppercase, alphanumeric. Default: first 6 chars of user_id
--    sans hyphens, uppercased. Customers can be told "request me with
--    code ABC123 at checkout."
-- =============================================================
alter table public.washer_profiles
  add column if not exists wash_handle text;

update public.washer_profiles
set wash_handle = upper(substring(replace(user_id::text, '-', '') from 1 for 6))
where wash_handle is null;

create unique index if not exists washer_profiles_wash_handle_uk
  on public.washer_profiles (wash_handle);

-- =============================================================
-- 2. Direct request fields on bookings.
--    requested_washer_id: who the customer asked for.
--    request_expires_at: when the request lapses and the booking falls
--      into the general queue. Default 5 minutes from creation.
-- =============================================================
alter table public.bookings
  add column if not exists requested_washer_id uuid references public.users(id),
  add column if not exists request_expires_at timestamptz,
  add column if not exists request_declined_at timestamptz,
  add column if not exists discount_cents int not null default 0,
  add column if not exists points_redeemed int not null default 0,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references public.users(id),
  add column if not exists cancellation_reason text;

create index if not exists bookings_requested_washer_idx
  on public.bookings (requested_washer_id, request_expires_at)
  where requested_washer_id is not null;

-- =============================================================
-- 3. Update washer queue read policy:
--    - General queue still shows pending unclaimed jobs
--    - But hides jobs with an active direct request to a different washer
--    - The requested washer always sees their own direct request
-- =============================================================
drop policy if exists "washers see unclaimed queue" on public.bookings;
create policy "washers see unclaimed queue"
  on public.bookings for select
  using (
    status = 'pending'
    and assigned_washer_id is null
    and assigned_partner_id is null
    and (
      requested_washer_id is null
      or request_expires_at < now()
      or request_declined_at is not null
      or requested_washer_id = auth.uid()
    )
  );

-- =============================================================
-- 4. Customer can cancel their own booking via update (status -> cancelled)
--    The existing "customers update own bookings" policy already allows
--    SET on customer-owned rows; no schema change needed.
-- =============================================================

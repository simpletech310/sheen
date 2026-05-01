-- =============================================================
-- Fix: addresses RLS — allow washers/partners to read addresses
-- for bookings they are assigned to or can see in the queue.
--
-- Root cause: "addresses own" only allows auth.uid() = user_id,
-- so when a pro's queue/job-detail page joins addresses on a
-- customer's booking, the row is invisible and the join returns
-- null, producing the "," display bug.
-- =============================================================

drop policy if exists "addresses booking parties read" on public.addresses;
create policy "addresses booking parties read"
  on public.addresses
  for select
  using (
    -- Always allow reading your own addresses
    auth.uid() = user_id
    or
    -- Allow reading addresses attached to bookings the user can access:
    -- assigned washer, assigned partner, OR any pending unclaimed job
    -- (so the queue shows the address before the pro claims it)
    exists (
      select 1 from public.bookings b
      where b.address_id = id
        and (
          b.assigned_washer_id  = auth.uid()
          or b.assigned_partner_id = auth.uid()
          or (b.status = 'pending' and b.assigned_washer_id is null)
        )
    )
  );

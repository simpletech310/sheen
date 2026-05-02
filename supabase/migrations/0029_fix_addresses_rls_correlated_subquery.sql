-- Fix: 0020 used `id` unqualified inside the EXISTS subquery, which Postgres
-- resolves to `b.id` (the inner bookings row), turning the predicate into
-- the impossible `b.address_id = b.id` (different uuid spaces, never matches).
-- The OR branch silently returned 0 rows, so a pro could never read the
-- address of any booking — including ones assigned to them — and the
-- queue/job-detail page rendered "ADDRESS , ,".
--
-- Fully qualify the outer table reference so the correlation actually
-- correlates.
drop policy if exists "addresses booking parties read" on public.addresses;

create policy "addresses booking parties read"
  on public.addresses
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.bookings b
      where b.address_id = public.addresses.id
        and (
          b.assigned_washer_id  = auth.uid()
          or b.assigned_partner_id = auth.uid()
          or (b.status = 'pending' and b.assigned_washer_id is null)
        )
    )
  );

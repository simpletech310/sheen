-- =============================================================
-- Fix: washers can't claim unclaimed bookings.
--
-- Root cause: bookings RLS allows washers to SELECT pending+unclaimed
-- rows (the queue), but the only UPDATE policy requires
-- assigned_washer_id = auth.uid() — which is FALSE for an unclaimed
-- row. The claim API's UPDATE returned 0 rows and surfaced as "Already
-- claimed". Add a policy that lets a washer UPDATE an unclaimed
-- pending row, with a CHECK that the resulting row is theirs.
--
-- Also adds:
--  * QR check-in code fields (used by /pro/jobs/<id>/checkin and
--    /c/checkin/<code>) — qr_check_in_code already exists; we add a
--    helper to generate one.
--  * approval timestamps for the customer-side fund-release step.
--  * job_photos column on bookings to hold post-wash work photos
--    (separate from condition_photo_paths which are pre-wash).
-- =============================================================

-- 1. Claim policy.
drop policy if exists "washers can claim unclaimed queue" on public.bookings;
create policy "washers can claim unclaimed queue"
  on public.bookings for update
  using (status = 'pending' and assigned_washer_id is null)
  with check (auth.uid() = assigned_washer_id);

-- 2. Backfill QR codes for any matched/active bookings that don't have
--    one yet — gives existing test bookings a code without forcing the
--    customer to re-book.
update public.bookings
set qr_check_in_code = upper(substring(md5(id::text || created_at::text) for 8))
where qr_check_in_code is null
  and status in ('matched','en_route','arrived','in_progress','pending');

-- 3. Approval / fund-release columns.
alter table public.bookings
  add column if not exists customer_approved_at timestamptz;
alter table public.bookings
  add column if not exists customer_approval_note text;
alter table public.bookings
  add column if not exists funds_released_at timestamptz;

-- 4. Work-photo storage. condition_photo_paths on booking_vehicles is the
--    pre-wash record; this column is the post-wash proof album that
--    customers see when approving.
alter table public.bookings
  add column if not exists work_photo_paths text[] default '{}';

-- 5. Auto-generate qr_check_in_code on every new booking.
create or replace function public.set_booking_qr_code()
returns trigger
language plpgsql
as $$
begin
  if new.qr_check_in_code is null then
    new.qr_check_in_code := upper(substring(md5(coalesce(new.id::text, gen_random_uuid()::text) || clock_timestamp()::text) for 8));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_bookings_qr on public.bookings;
create trigger trg_bookings_qr
  before insert on public.bookings
  for each row
  execute function public.set_booking_qr_code();

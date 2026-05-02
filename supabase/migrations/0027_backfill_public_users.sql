-- Backfill any auth.users that are missing a matching public.users row.
-- The handle_new_user() trigger covers new signups, but pre-trigger accounts
-- and any signups where the trigger errored silently end up orphaned, which
-- causes FK violations on inserts to vehicles, bookings, addresses, etc.
insert into public.users (id, email, role)
select
  au.id,
  au.email,
  (case
    when au.raw_user_meta_data->>'role' in ('customer', 'washer', 'partner_owner', 'admin')
      then au.raw_user_meta_data->>'role'
    else 'customer'
  end)::public.user_role
from auth.users au
left join public.users pu on pu.id = au.id
where pu.id is null
on conflict (id) do nothing;

-- Same backfill for customer_profiles so the garage / loyalty / addresses
-- features all have somewhere to attach.
insert into public.customer_profiles (user_id)
select u.id
from public.users u
left join public.customer_profiles cp on cp.user_id = u.id
where cp.user_id is null
on conflict (user_id) do nothing;

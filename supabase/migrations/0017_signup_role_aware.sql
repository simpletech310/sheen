-- =============================================================
-- Make the new-user trigger role-aware. Customer signup is the
-- default; washers and partners pass role through user_metadata at
-- signUp() time (see app/(auth)/sign-up). Without this, every signup
-- created a customer row and the user had to be manually promoted.
--
-- Also auto-creates the role-appropriate profile so /pro/* surfaces
-- work the moment they confirm their email — no second mutation
-- required from the client.
-- =============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  meta_role text;
  meta_full_name text;
  resolved_role user_role;
begin
  meta_role := coalesce(new.raw_user_meta_data->>'role', 'customer');
  meta_full_name := nullif(new.raw_user_meta_data->>'full_name', '');

  -- Coerce to enum, fall back to 'customer' for any unknown string.
  begin
    resolved_role := meta_role::user_role;
  exception when invalid_text_representation then
    resolved_role := 'customer'::user_role;
  end;

  insert into public.users (id, email, role, full_name)
  values (new.id, new.email, resolved_role, meta_full_name)
  on conflict (id) do update
    set role = excluded.role,
        full_name = coalesce(excluded.full_name, public.users.full_name);

  -- Always create a customer_profiles row — even washers + partners
  -- can book personal washes, and lots of code assumes the row exists.
  insert into public.customer_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  -- Role-specific profile so /pro/* surfaces work the moment they
  -- confirm their email — no second mutation required from the client.
  -- Partners go through /partner/apply which collects business_name +
  -- slug (both NOT NULL on partner_profiles) so we don't auto-create
  -- their row here.
  if resolved_role = 'washer' then
    insert into public.washer_profiles (user_id, status)
    values (new.id, 'pending')
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

-- Fix infinite recursion in RLS policies on public.users (and the admin
-- bypass policies on every other table that read public.users to check
-- role='admin'). The recursion happens because the admin SELECT policy on
-- public.users itself queries public.users — Postgres evaluates the policy
-- to read the row, which evaluates the policy again, etc.
--
-- Solution: a SECURITY DEFINER function that bypasses RLS to look up the
-- caller's role. All admin policies call the function instead of inlining
-- a subquery against public.users.

-- 1. Helper that bypasses RLS to look up a user's role.
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.users where id = uid),
    false
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated, service_role;

-- 2. Drop the recursive policies (idempotent — safe to re-run).
drop policy if exists "users admin read all"   on public.users;
drop policy if exists "users admin update all" on public.users;
drop policy if exists "claims admin all"       on public.damage_claims;
drop policy if exists "support admin all"      on public.support_tickets;
drop policy if exists "audit admin read"       on public.audit_log;
drop policy if exists "bookings admin all"     on public.bookings;
drop policy if exists "washers admin all"      on public.washer_profiles;
drop policy if exists "partners admin all"     on public.partner_profiles;
drop policy if exists "payouts admin read"     on public.payouts;

-- 3. Recreate using is_admin(auth.uid()) — no recursion because the
--    function runs SECURITY DEFINER and skips RLS on the users lookup.
create policy "users admin read all"   on public.users           for select using (public.is_admin(auth.uid()));
create policy "users admin update all" on public.users           for update using (public.is_admin(auth.uid()));
create policy "claims admin all"       on public.damage_claims   for all    using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "support admin all"      on public.support_tickets for all    using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "audit admin read"       on public.audit_log       for select using (public.is_admin(auth.uid()));
create policy "bookings admin all"     on public.bookings        for all    using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "washers admin all"      on public.washer_profiles for all    using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "partners admin all"     on public.partner_profiles for all   using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "payouts admin read"     on public.payouts         for select using (public.is_admin(auth.uid()));

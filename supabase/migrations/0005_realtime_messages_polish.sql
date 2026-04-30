-- v1 polish: realtime messaging + partner uploads + admin verify flag.
-- Adds the schema needed to ship items 1, 9, and 10 from the readiness audit.

-- =============================================================
-- 1. Messages between customer and assigned pro (per booking)
-- =============================================================

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  body text not null check (length(body) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists messages_booking_idx on public.messages (booking_id, created_at);
create index if not exists messages_sender_idx on public.messages (sender_id);

alter table public.messages enable row level security;

-- A user can read messages on bookings where they're the customer or the
-- assigned pro (washer or partner). Same rule for inserts.
drop policy if exists "messages read for booking parties" on public.messages;
create policy "messages read for booking parties"
  on public.messages for select
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (
          b.customer_id = auth.uid()
          or b.assigned_washer_id = auth.uid()
          or b.assigned_partner_id = auth.uid()
        )
    )
  );

drop policy if exists "messages insert for booking parties" on public.messages;
create policy "messages insert for booking parties"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (
          b.customer_id = auth.uid()
          or b.assigned_washer_id = auth.uid()
          or b.assigned_partner_id = auth.uid()
        )
    )
  );

drop policy if exists "messages update read by recipient" on public.messages;
create policy "messages update read by recipient"
  on public.messages for update
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (
          b.customer_id = auth.uid()
          or b.assigned_washer_id = auth.uid()
          or b.assigned_partner_id = auth.uid()
        )
    )
  );

-- Admin policy via the existing is_admin function (added in 0004).
drop policy if exists "messages admin all" on public.messages;
create policy "messages admin all"
  on public.messages for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Enable realtime on the messages table
alter publication supabase_realtime add table public.messages;

-- =============================================================
-- 2. Washer background-check verification flag
-- =============================================================

alter table public.washer_profiles
  add column if not exists background_check_verified bool not null default false,
  add column if not exists background_check_verified_at timestamptz,
  add column if not exists background_check_verified_by uuid references public.users(id);

-- =============================================================
-- 3. Partner application document storage paths
-- =============================================================

alter table public.partner_profiles
  add column if not exists gl_doc_path text,
  add column if not exists license_doc_path text,
  add column if not exists portfolio_photos text[] default '{}';

-- =============================================================
-- 4. Helpful index for partner job claim queue
-- =============================================================

create index if not exists bookings_partner_pending_idx
  on public.bookings (status, assigned_partner_id)
  where status = 'pending' and assigned_partner_id is null;

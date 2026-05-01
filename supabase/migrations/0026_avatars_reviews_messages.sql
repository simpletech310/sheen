-- =============================================================
-- Avatars + display names + review aggregation + chat photos.
--
-- One migration covering: profile-image storage + display name
-- columns, the rating/review-count rollup on the pro profiles, and
-- the message-attachment column for chat. Idempotent.
-- =============================================================

-- ---------- users.avatar_url + display_name ----------
-- display_name is what shows in chat headers and review comments.
-- avatar_url is a path inside the `avatars` bucket; we'll public-read it.
alter table public.users
  add column if not exists avatar_url text,
  add column if not exists display_name text;

-- Backfill display_name from full_name where missing so existing
-- users render with their on-file name immediately.
update public.users
  set display_name = full_name
  where display_name is null and full_name is not null;

-- ---------- avatars storage bucket ----------
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Owner-write, public-read. Path convention: <user_id>/<file>.
drop policy if exists "avatars own write" on storage.objects;
create policy "avatars own write"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars own update" on storage.objects;
create policy "avatars own update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars own delete" on storage.objects;
create policy "avatars own delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- ---------- review aggregation (rating_avg + reviews_count) ----------
-- The columns rating_avg/reviews_count on washer_profiles + partner_profiles
-- already exist (or rating_avg does). We add reviews_count if missing and
-- backfill from the reviews table; a trigger keeps both in sync going forward.
alter table public.washer_profiles
  add column if not exists reviews_count int not null default 0;

alter table public.partner_profiles
  add column if not exists reviews_count int not null default 0;

-- Backfill from existing reviews so live profiles aren't wrong on day 1.
with agg as (
  select reviewee_id,
         avg(rating_int)::numeric(3,2) as avg_rating,
         count(*)::int as cnt
    from public.reviews
   where rating_int is not null
   group by reviewee_id
)
update public.washer_profiles wp
   set rating_avg    = agg.avg_rating,
       reviews_count = agg.cnt
  from agg
 where wp.user_id = agg.reviewee_id;

with agg as (
  select reviewee_id,
         avg(rating_int)::numeric(3,2) as avg_rating,
         count(*)::int as cnt
    from public.reviews
   where rating_int is not null
   group by reviewee_id
)
update public.partner_profiles pp
   set rating_avg    = agg.avg_rating,
       reviews_count = agg.cnt
  from agg
 where pp.user_id = agg.reviewee_id;

-- Trigger fn: re-aggregate the affected pro on insert/update/delete.
create or replace function public.refresh_pro_rating(target uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_avg numeric(3,2);
  v_cnt int;
begin
  select avg(rating_int)::numeric(3,2), count(*)
    into v_avg, v_cnt
    from public.reviews
   where reviewee_id = target and rating_int is not null;

  update public.washer_profiles
     set rating_avg = coalesce(v_avg, 0),
         reviews_count = coalesce(v_cnt, 0)
   where user_id = target;

  update public.partner_profiles
     set rating_avg = coalesce(v_avg, 0),
         reviews_count = coalesce(v_cnt, 0)
   where user_id = target;
end;
$$;

create or replace function public.reviews_after_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_pro_rating(old.reviewee_id);
    return old;
  end if;
  perform public.refresh_pro_rating(new.reviewee_id);
  if tg_op = 'UPDATE' and new.reviewee_id is distinct from old.reviewee_id then
    perform public.refresh_pro_rating(old.reviewee_id);
  end if;
  return new;
end;
$$;

drop trigger if exists reviews_aggregate on public.reviews;
create trigger reviews_aggregate
  after insert or update or delete on public.reviews
  for each row execute function public.reviews_after_change();

-- ---------- messages: image attachments ----------
-- The chat (messages) table is text-only today. Add an optional photo
-- path (in the booking-photos bucket — we already have RLS for it).
alter table public.messages
  add column if not exists image_path text;

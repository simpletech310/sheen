-- Track payout type so wash earnings vs tips show separately in the wallet,
-- and allow one of each kind per booking.

alter table public.payouts
  add column if not exists kind text not null default 'wash';

-- Drop any pre-existing single-column unique on booking_id; we want
-- uniqueness per (booking_id, kind) so wash + tip can coexist.
do $$
declare
  con record;
begin
  for con in
    select conname
    from pg_constraint
    where conrelid = 'public.payouts'::regclass
      and contype = 'u'
      and conkey = (
        select array_agg(attnum)
        from pg_attribute
        where attrelid = 'public.payouts'::regclass
          and attname = 'booking_id'
      )
  loop
    execute format('alter table public.payouts drop constraint %I', con.conname);
  end loop;
end$$;

create unique index if not exists payouts_booking_kind_uk
  on public.payouts (booking_id, kind);

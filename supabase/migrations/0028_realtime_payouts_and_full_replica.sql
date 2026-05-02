-- Make payout changes broadcast to clients so the wallet UI can update
-- live the moment a wash is funded / a tip lands. Until now `payouts`
-- was the only money-flow table not in the realtime publication, which
-- is why the wallet stayed stale until a hard refresh.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'payouts'
  ) then
    alter publication supabase_realtime add table public.payouts;
  end if;
end$$;

-- REPLICA IDENTITY FULL on bookings + payouts so realtime UPDATE payloads
-- carry the entire row (every column), not just the changed columns. The
-- queue client filters incoming rows by columns that may not be the ones
-- that changed (requested_washer_id, addresses lat/lng, service flags),
-- and the wallet client needs amount_cents + kind even when only status
-- flipped. Without this, `payload.new` is sparse and filters silently
-- mis-fire.
alter table public.bookings replica identity full;
alter table public.payouts replica identity full;

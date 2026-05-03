-- =============================================================
-- ASAP / Rush bookings.
--
-- (Originally landed as a duplicate 0019 alongside
-- 0019_fix_checklist_tier_names; renumbered to 0034 to keep migration
-- versions unique. All statements are idempotent — safe to re-run.)
--
-- Customer hits "Rush" → pays a small surcharge on top of the regular
-- price → we promise a pro within 60 minutes. The pro who claims it
-- gets a small bonus IF they reach the address before the deadline.
-- If the pro is late: the customer is partially refunded, the pro's
-- payout drops below their normal cut, and the difference goes back
-- to the platform.
--
-- Numbers (see lib/rush.ts for the source of truth):
--   customer surcharge         = +15% of service_cents
--   washer bonus on success    = +10% of service_cents
--   washer penalty if late     =  −5% of service_cents (off normal cut)
--   customer rebate if late    =  −5% of service_cents (off total)
--
-- We store the raw cents amounts on the booking at create time so the
-- math is locked in even if the constants are tuned later.
-- =============================================================

alter table public.bookings
  add column if not exists is_rush boolean not null default false;

alter table public.bookings
  add column if not exists rush_deadline timestamptz;

alter table public.bookings
  add column if not exists rush_surcharge_cents int not null default 0;

alter table public.bookings
  add column if not exists rush_bonus_cents int not null default 0;

-- Stamp on the arrived transition. Used by lib/payout/release.ts to
-- decide bonus vs penalty.
alter table public.bookings
  add column if not exists arrived_at timestamptz;

-- Tri-state: NULL = undetermined (job still open), TRUE = pro made it,
-- FALSE = pro was late and forfeits the bonus.
alter table public.bookings
  add column if not exists rush_made_in_time boolean;

-- Speed up the queue's "pending rush" filter so the pro sees them
-- floated to the top.
create index if not exists bookings_rush_pending_idx
  on public.bookings (is_rush, status, rush_deadline)
  where is_rush = true and status in ('pending','matched','en_route','arrived');

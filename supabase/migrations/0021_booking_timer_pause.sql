-- Add pause tracking columns to bookings for the job timer.
--
-- paused_at:       set when the pro taps "Pause", cleared on "Resume".
-- total_paused_ms: running total of all previous pause durations.
--
-- Elapsed = (now - started_at) - total_paused_ms
--           - (now - paused_at) [if currently paused]

alter table public.bookings
  add column if not exists paused_at      timestamptz default null,
  add column if not exists total_paused_ms bigint not null default 0;

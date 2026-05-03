-- =============================================================
-- Customer timezone on bookings.
--
-- All scheduled_window_start / scheduled_window_end timestamps are
-- already TIMESTAMPTZ (absolute UTC under the hood), so the math is
-- correct regardless of who's looking. But for *rendering* — the
-- customer who booked sees "Tomorrow 10am Pacific" while the pro
-- who claimed sees "Tomorrow 1pm Eastern" — both pointing at the
-- same instant. That part already works via toLocaleString in the
-- viewer's own TZ.
--
-- This column captures the customer's TZ at booking time so the rare
-- view that wants to render in the *customer's* clock (e.g. the pro
-- seeing "this is what the customer thinks the time is") can do so.
-- It also helps with audit/debugging — "did this customer book at
-- 10am Pacific or 10am Eastern?" is now answerable from the row.
-- =============================================================

alter table public.bookings
  add column if not exists customer_tz text;

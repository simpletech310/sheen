-- SHEEN v1 — seed membership plans + achievements catalog

insert into public.membership_plans (tier, display_name, monthly_price_cents, included_washes, max_service_tier, sort_order, description) values
  ('basic', 'Basic',  5900,  2,  'full',     1, '2 Express OR 1 Full Detail per month. Perfect for the daily driver.'),
  ('pro',   'Pro',    12900, 4,  'full',     2, '4 Full Detail-tier washes per month. Most popular.'),
  ('elite', 'Elite',  24900, 6,  'premium',  3, '6 washes up to Premium tier. Includes priority booking.')
on conflict do nothing;

insert into public.achievements (id, display_name, description, icon, bonus_points, sort_order) values
  ('first_wash',           'First Wash',          'Booked your first Sheen.',                                    '★',  100,  1),
  ('loyal',                'Loyal',               'Completed 5 washes.',                                         '🪩', 250,  2),
  ('detailing_fan',        'Detailing Fan',       'Completed 10 washes.',                                        '✨', 500,  3),
  ('showroom_connoisseur', 'Showroom Connoisseur','Booked a Showroom-tier wash.',                                '🏆', 1000, 4),
  ('quarterly_regular',    'Quarterly Regular',   'Booked 3 washes within 30 days.',                             '📅', 300,  5),
  ('member',               'Member',              'Subscribed to a Sheen membership.',                           '💳', 200,  6),
  ('referrer',             'Referrer',            'Brought a friend.',                                           '🤝', 200,  7),
  ('first_job',            'First Job',           'Washer completed their first job.',                           '🪣', 250,  8),
  ('hundred_club',         'Hundred Club',        'Washer hit 100 completed jobs.',                              '💯', 1000, 9),
  ('top_rated',            'Top Rated',           'Maintained 4.9★ over 50+ jobs.',                              '⭐', 1000, 10)
on conflict do nothing;

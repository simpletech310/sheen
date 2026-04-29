# Sheen — Make it look sharp.

On-demand wash & detail marketplace. Phase 1 MVP — Next.js 14 PWA + Supabase + Stripe Connect.

## Stack

- Next.js 14 App Router · TypeScript · Tailwind CSS
- Supabase (Auth + Postgres + RLS + Realtime + Storage)
- Stripe Connect (Express for solo washers, Standard for partners)
- Instrument Serif (display) · DM Sans (body)
- Installable PWA (manifest + icons)

## Local development

```bash
npm install
cp .env.example .env.local   # fill in Supabase + Stripe keys
npm run dev                  # http://localhost:3000
```

## Database

Apply the SQL in `supabase/migrations/0001_init.sql` followed by `supabase/seed.sql` via the
**Supabase Studio → SQL editor** for the linked project. (The CLI `apply-migrations.mjs` script
is intended for self-hosted projects; Supabase Cloud has no public raw-SQL endpoint, so the
Studio editor is the supported path.)

After applying, you should see:

- 13 tables: `users`, `customer_profiles`, `washer_profiles`, `partner_profiles`, `services`,
  `addresses`, `vehicles`, `bookings`, `booking_events`, `booking_photos`, `reviews`, `payouts`,
  `availability`
- 9 services seeded (4 auto tiers, 4 home tiers, 1 commercial)
- 3 demo partners (`/p/lefty-detail`, `/p/pacific-power`, `/p/westside-auto`)
- RLS enabled on every table, with policies that match the SHEEN PLAN doc

## Routes

| Type      | Routes                                                                                   |
|-----------|------------------------------------------------------------------------------------------|
| Marketing | `/`, `/auto`, `/home`, `/business`, `/wash`, `/partner`, `/help`, `/safety`, `/legal/*`, `/cities/[slug]`, `/p/[slug]` |
| Auth      | `/sign-in`, `/sign-up`, `/auth/callback`                                                  |
| Customer  | `/app`, `/app/book/{auto,address,pay}`, `/app/tracking/[id]`, `/app/rate/[id]`, `/app/trips`, `/app/wallet`, `/app/places`, `/app/garage`, `/app/me` |
| Washer    | `/pro/onboard`, `/pro/queue`, `/pro/queue/[jobId]`, `/pro/jobs/[jobId]/{navigate,checkin,timer,photos}`, `/pro/earnings`, `/pro/me` |
| Partner   | `/partner/apply`, `/partner/dashboard`                                                    |
| API       | `/api/bookings`, `/api/bookings/[id]/{claim,complete,rate}`, `/api/stripe/{checkout,connect-onboard,webhook}`, `/api/partner/apply`, `/api/auth/sign-out` |

**No iPhone mockups are rendered anywhere.** All formerly-iPhone-framed screens (customer app,
washer app, partner apply) are full responsive web routes; the customer/washer surfaces use a
mobile-first `max-w-md` centered layout with a bottom nav, no notch or home indicator.

## Fee model (`lib/stripe/fees.ts`)

- Customer trust fee: 10% of service (covers $2,500 damage guarantee + insurance pool)
- Solo washer commission: 22% (18% on repeat customers)
- Partner finder's fee: 12% of service, or flat $150 for jobs ≥ $1,000
- Tips: 100% to the washer, no platform cut

## Deploy

1. Push this repo to GitHub.
2. Import to Vercel.
3. Paste the env vars from `.env.example` into the Vercel project (use TEST keys for now).
4. After first deploy, set the Stripe webhook endpoint to `https://<your-domain>/api/stripe/webhook`
   and copy the signing secret back into Vercel as `STRIPE_WEBHOOK_SECRET`.

## What's stubbed for MVP

- **Mapbox**: tracking and navigate pages render an empty cobalt block. Set
  `NEXT_PUBLIC_MAPBOX_TOKEN` to swap in real maps.
- **Twilio SMS**: assignment notifications log a `booking_events` row instead of sending SMS.
- **Resend email**: receipt emails not yet wired; transactional via Supabase Auth only.
- **Photo uploads**: client-side preview only; Supabase Storage upload is the next sprint.
- **Stripe transfers on completion**: the `/api/bookings/[id]/complete` route inserts a `payouts`
  row in `pending` state. Actual `stripe.transfers.create` happens on the next iteration once
  Connect Express accounts are seeded.

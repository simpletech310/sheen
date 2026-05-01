# Supabase auth emails — setup

The 5 branded templates in `supabase/templates/` cover every email
Supabase sends from Auth: signup confirmation, magic link, password
recovery, email change, and admin invite.

Each template uses `{{ if eq .Data.role "washer" }}…{{ end }}` to switch
the entire palette: customers see the **royal-blue + sol-gold + bone**
look (matches the Sheen PWA icon), washers see the **ink + sol-gold +
bone** dark theme (matches the Sheen Pro PWA icon).

## One-time setup

```bash
# 1. Get a personal access token (one-time, lives in your terminal)
# 2. Push templates + subjects + URL allowlist + site URL
SUPABASE_ACCESS_TOKEN=sbp_… node scripts/setup-supabase-emails.mjs
```

The script reads `NEXT_PUBLIC_SUPABASE_URL` for the project ref and
`NEXT_PUBLIC_APP_URL` for the site URL / redirect allowlist. Re-run it
whenever you change a template — idempotent, no duplicates.

Generate a token at: <https://supabase.com/dashboard/account/tokens>

## What it sets

| Auth-config field | Value |
| --- | --- |
| `site_url` | `NEXT_PUBLIC_APP_URL` from `.env.local` |
| `uri_allow_list` | `${APP_URL}/**`, `${APP_URL}/auth/callback`, `${APP_URL}/reset-password` |
| `mailer_subjects_*` | Short, branded subject lines (5 templates) |
| `mailer_templates_*_content` | Rendered HTML (5 templates) |

## Manual dashboard fallback

If you'd rather paste them by hand:

1. Open <https://supabase.com/dashboard/project/_/auth/templates>
2. For each template (Confirm signup, Magic link, Reset password,
   Change email, Invite user):
   - Copy the matching file from `supabase/templates/`
   - Paste into the template body
   - Set the subject from the table below
3. Open **Auth → URL Configuration** and add the redirect URLs:
   ```
   https://YOUR-DOMAIN/**
   https://YOUR-DOMAIN/auth/callback
   https://YOUR-DOMAIN/reset-password
   ```

| Template | Subject |
| --- | --- |
| Confirm signup | `Confirm your Sheen account` |
| Invite user | `You're invited to Sheen` |
| Magic link | `Your Sheen sign-in link` |
| Reset password | `Reset your Sheen password` |
| Change email | `Confirm your new Sheen email` |

## How role detection works

Supabase passes the user's `raw_user_meta_data` into the email template
as `.Data`. The signup form already stamps `role: "washer"` (or
`"customer"`, `"admin"`) into that field via `supabase.auth.signUp({
options: { data: { role } } })`. No backend change needed — the
`{{ if eq .Data.role "washer" }}…{{ end }}` blocks just read what's
already there.

## Auth flow surfaces

- **Forgot password** — `/forgot-password` calls `resetPasswordForEmail`
  with `redirectTo: ${APP_URL}/auth/callback?type=recovery`.
- **Reset password** — `/reset-password` runs after the recovery callback
  redirects there. Calls `updateUser({ password })` then routes by role.
- **Magic link** — `Email me a magic link` button on `/sign-in` calls
  `signInWithOtp` with the same callback URL.
- **Auth callback** — `/auth/callback` exchanges the code, detects
  `type=recovery` to route to the reset surface, and tags fresh signups
  with `?welcome=1` for the PWA install nudge.

## Testing

After running the setup script:

1. **Recovery**: visit `/forgot-password`, enter your email, check
   inbox. Header should be royal blue (or ink black if your role is
   "washer"), CTA links to `…/auth/callback?code=…&type=recovery`.
2. **Magic link**: on `/sign-in`, click "Email me a magic link". Check
   inbox; tap link; should sign you in and route by role.
3. **Confirmation**: sign up a new account. Check inbox; tap link;
   should land in `/app` (or `/pro`) with `?welcome=1`.

If a link 404s, the redirect URL isn't in the allowlist — re-run the
setup script or add it in **Auth → URL Configuration**.

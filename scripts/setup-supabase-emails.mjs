#!/usr/bin/env node
/**
 * Pushes the 5 branded email templates from supabase/templates/ to the
 * project's Auth config via the Supabase Management API. Also sets
 * matching subjects + the SITE_URL + redirect-URL allowlist.
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_… node scripts/setup-supabase-emails.mjs
 *
 * Get an access token at https://supabase.com/dashboard/account/tokens.
 * Project ref is read from NEXT_PUBLIC_SUPABASE_URL in .env.local.
 *
 * Idempotent — re-runnable any time the templates change.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// --- env loader (no dotenv dep) ---
function loadEnv(path) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const [, k, v] = m;
      if (process.env[k] != null) continue;
      process.env[k] = v.replace(/^["']|["']$/g, "");
    }
  } catch {}
}
loadEnv(resolve(process.cwd(), ".env.local"));
loadEnv(resolve(process.cwd(), ".env"));

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

if (!ACCESS_TOKEN) {
  console.error("✗ SUPABASE_ACCESS_TOKEN missing.");
  console.error("  Generate one at https://supabase.com/dashboard/account/tokens");
  console.error("  then re-run: SUPABASE_ACCESS_TOKEN=sbp_… node scripts/setup-supabase-emails.mjs");
  process.exit(1);
}
if (!SUPA_URL) {
  console.error("✗ NEXT_PUBLIC_SUPABASE_URL missing from .env.local");
  process.exit(1);
}

// Project ref is the subdomain in NEXT_PUBLIC_SUPABASE_URL.
const projectRef = new URL(SUPA_URL).hostname.split(".")[0];

const TEMPLATES_DIR = resolve(process.cwd(), "supabase/templates");

function readTemplate(name) {
  return readFileSync(resolve(TEMPLATES_DIR, name), "utf8");
}

// Auth config field names per Supabase Management API:
//   mailer_subjects_*    — subject line per template
//   mailer_templates_*   — full HTML body per template
// (See: https://supabase.com/docs/reference/api/v1-update-auth-service-config)
const config = {
  // Where reset / magic-link redirect_to URLs are validated against.
  site_url: APP_URL,
  // Allowlist must include every URL we hand to Supabase as `emailRedirectTo`
  // or `redirectTo`. Trailing wildcards cover both /auth/callback and /reset-password.
  uri_allow_list: [
    `${APP_URL}/**`,
    `${APP_URL}/auth/callback`,
    `${APP_URL}/auth/callback?**`,
    `${APP_URL}/reset-password`,
  ].join(","),

  // Subjects — short, branded, no clickbait.
  mailer_subjects_confirmation: "Confirm your Sheen account",
  mailer_subjects_invite: "You're invited to Sheen",
  mailer_subjects_magic_link: "Your Sheen sign-in link",
  mailer_subjects_recovery: "Reset your Sheen password",
  mailer_subjects_email_change: "Confirm your new Sheen email",

  // Bodies — rendered HTML with Sheen branding + role-aware palette.
  mailer_templates_confirmation_content: readTemplate("confirmation.html"),
  mailer_templates_invite_content: readTemplate("invite.html"),
  mailer_templates_magic_link_content: readTemplate("magic_link.html"),
  mailer_templates_recovery_content: readTemplate("recovery.html"),
  mailer_templates_email_change_content: readTemplate("email_change.html"),
};

async function main() {
  console.log(`Pushing email templates → project ${projectRef}`);
  console.log(`Site URL: ${APP_URL}\n`);

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`✗ ${res.status} ${res.statusText}`);
    console.error(text);
    process.exit(1);
  }

  for (const key of Object.keys(config)) {
    if (key.startsWith("mailer_templates_")) {
      const name = key.replace("mailer_templates_", "").replace("_content", "");
      console.log(`  ✓ template: ${name}`);
    } else if (key.startsWith("mailer_subjects_")) {
      const name = key.replace("mailer_subjects_", "");
      console.log(`  ✓ subject:  ${name} → "${config[key]}"`);
    } else {
      console.log(`  ✓ ${key}`);
    }
  }
  console.log("\nDone. Templates are live in Supabase Auth.");
  console.log("Test a flow (forgot password, magic link) and inspect the email source to confirm.");
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});

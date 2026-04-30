#!/usr/bin/env node
// Create or upsert the demo washer account so QA can sign in and see
// the pro queue. Idempotent — safe to re-run; will reuse an existing
// auth user and just refresh the washer_profile + role.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ||= m[2];
}

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const EMAIL = "washer@sheen.local";
const PASSWORD = "SheenWasher2026!";
const FULL_NAME = "Demo Washer";
const HANDLE = "DEMOWASHER";

// 1. Create auth user (idempotent — fall back to lookup if it exists).
let userId;
const { data: created, error: createErr } = await supa.auth.admin.createUser({
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true,
  user_metadata: { full_name: FULL_NAME },
});
if (createErr) {
  if (!String(createErr.message).match(/already (registered|exists)/i)) {
    console.error("Create error:", createErr.message);
    process.exit(1);
  }
  const { data: list } = await supa.auth.admin.listUsers({ perPage: 500 });
  const existing = list?.users.find((u) => u.email === EMAIL);
  userId = existing?.id;
  if (!userId) {
    console.error("Could not find existing washer auth user.");
    process.exit(1);
  }
  // Reset the password so the credentials below always work after a re-run.
  await supa.auth.admin.updateUserById(userId, { password: PASSWORD });
  console.log(`= using existing washer auth user (${userId}) · password reset`);
} else {
  userId = created.user.id;
  console.log(`+ created washer auth user (${userId})`);
}

// 2. Upsert public.users with role=washer.
await supa.from("users").upsert(
  {
    id: userId,
    role: "washer",
    full_name: FULL_NAME,
    email: EMAIL,
  },
  { onConflict: "id" }
);
console.log(`= public.users role=washer set for ${EMAIL}`);

// 3. Upsert washer_profiles. status=active so jobs show up in the queue,
//    can_wash_big_rig=true so the new big-rig jobs are visible too.
//    No base_lat/base_lng + no availability rows → no radius/window
//    filtering → every pending job in the platform is visible.
await supa.from("washer_profiles").upsert(
  {
    user_id: userId,
    status: "active",
    service_radius_miles: 25,
    has_own_water: true,
    has_own_power: true,
    has_pressure_washer: true,
    can_detail_interior: true,
    can_do_paint_correction: true,
    can_wash_big_rig: true,
    wash_handle: HANDLE,
    bio: "Demo washer for QA. Takes any job, anywhere.",
  },
  { onConflict: "user_id" }
);
console.log(`= washer_profiles status=active, big-rig=true, @${HANDLE}`);

console.log("\nLogin:");
console.log(`  email:    ${EMAIL}`);
console.log(`  password: ${PASSWORD}`);
console.log(`  url:      ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/sign-in`);
console.log("\nThen visit /pro/queue to see jobs (no radius/availability filters applied).");
console.log(`Profile: /pro/me · public referral page: /r/${HANDLE}`);

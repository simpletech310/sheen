#!/usr/bin/env node
// Seed three real washer accounts with auto-confirmed emails so they
// can sign in immediately. Idempotent — re-running resets the password
// and refreshes the washer_profiles row.
//
// Run: node scripts/create-real-washers.mjs

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

// Each washer goes to active status, big-rig capable, no base location
// or availability rows so every pending job shows up in their queue.
const WASHERS = [
  {
    email: "edward.mosby@sheen.local",
    password: "Gander448!",
    fullName: "Edward Mosby",
    handle: "EDMOSBY",
    bio: "Detail-obsessed. Show up sharp, leave it sharper.",
  },
  {
    email: "travis.walker@sheen.local",
    password: "power123",
    fullName: "Travis Walker",
    handle: "TRAVISW",
    bio: "10+ years on rigs and exotics. Two-bucket method, every time.",
  },
  {
    email: "milton.robertson@sheen.local",
    password: "power123",
    fullName: "Milton Robertson",
    handle: "MILTONR",
    bio: "Big-rig + auto specialist. On-site water and power.",
  },
];

async function ensureWasher(w) {
  // 1. Auth user — create or look up + reset password.
  let userId;
  const { data: created, error: createErr } = await supa.auth.admin.createUser({
    email: w.email,
    password: w.password,
    email_confirm: true,
    user_metadata: { full_name: w.fullName, role: "washer" },
  });
  if (createErr) {
    if (!String(createErr.message).match(/already (registered|exists)/i)) {
      throw createErr;
    }
    const { data: list } = await supa.auth.admin.listUsers({ perPage: 500 });
    const existing = list?.users.find((u) => u.email === w.email);
    if (!existing) throw new Error(`Could not find existing user ${w.email}`);
    userId = existing.id;
    // Reset password + bump email_confirmed so re-runs always produce
    // a sign-in-able account.
    await supa.auth.admin.updateUserById(userId, {
      password: w.password,
      email_confirm: true,
      user_metadata: { full_name: w.fullName, role: "washer" },
    });
    console.log(`  = existing auth user (${userId}) · password reset`);
  } else {
    userId = created.user.id;
    console.log(`  + created auth user (${userId})`);
  }

  // 2. Public users row.
  await supa
    .from("users")
    .upsert(
      { id: userId, role: "washer", full_name: w.fullName, email: w.email },
      { onConflict: "id" }
    );

  // 3. Washer profile — active, big-rig capable, full equipment kit,
  // no base location / no availability so the queue is wide open.
  await supa
    .from("washer_profiles")
    .upsert(
      {
        user_id: userId,
        status: "active",
        service_radius_miles: 50,
        has_own_water: true,
        has_own_power: true,
        has_pressure_washer: true,
        can_detail_interior: true,
        can_do_paint_correction: true,
        can_wash_big_rig: true,
        wash_handle: w.handle,
        bio: w.bio,
        background_check_verified: true,
      },
      { onConflict: "user_id" }
    );

  console.log(
    `  = washer_profile status=active, @${w.handle}, bg-check verified`
  );
}

console.log("Seeding washers…\n");

for (const w of WASHERS) {
  console.log(`${w.fullName} <${w.email}>`);
  try {
    await ensureWasher(w);
  } catch (e) {
    console.error(`  ! failed: ${e.message}`);
    process.exitCode = 1;
  }
  console.log("");
}

console.log("Done.\n");
console.log("Logins:");
for (const w of WASHERS) {
  console.log(`  ${w.email}  /  ${w.password}  →  /sign-in?role=washer`);
}
console.log(
  `\nQueue: ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/pro/queue`
);

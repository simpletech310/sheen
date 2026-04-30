#!/usr/bin/env node
// Create or upsert the demo admin account (admin@sheen.local / known password)
// and bump role='admin' on public.users.

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

const EMAIL = "admin@sheen.local";
const PASSWORD = "SheenAdmin2026!";

// 1. Try to create the auth user (idempotent)
let userId;
const { data: created, error: createErr } = await supa.auth.admin.createUser({
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true,
  user_metadata: { full_name: "Sheen Admin" },
});
if (createErr) {
  if (!String(createErr.message).match(/already (registered|exists)/i)) {
    console.error("Create error:", createErr.message);
    process.exit(1);
  }
  // Look up existing user by email
  const { data: list } = await supa.auth.admin.listUsers({ perPage: 500 });
  const existing = list?.users.find((u) => u.email === EMAIL);
  userId = existing?.id;
  if (!userId) {
    console.error("Could not find existing admin user.");
    process.exit(1);
  }
  console.log(`= using existing admin auth user (${userId})`);
} else {
  userId = created.user.id;
  console.log(`+ created admin auth user (${userId})`);
}

// 2. Upsert public.users row + bump role
await supa.from("users").upsert(
  {
    id: userId,
    role: "admin",
    full_name: "Sheen Admin",
    email: EMAIL,
  },
  { onConflict: "id" }
);
console.log(`= public.users role=admin set for ${EMAIL}`);

console.log("\nLogin:");
console.log(`  email:    ${EMAIL}`);
console.log(`  password: ${PASSWORD}`);
console.log(`  url:      ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/sign-in`);
console.log("\nThen visit /admin to use the console.");

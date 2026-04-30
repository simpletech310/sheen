#!/usr/bin/env node
// Diagnostic: dump the state of every booking so we can see which are
// "pending but not really claimable" — typically rows where status=pending
// but assigned_washer_id or assigned_partner_id is non-null.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ||= m[2];
}

const ref = process.env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\./)[1];
const password = process.env.SUPABASE_DB_PASSWORD || process.argv[2];
if (!password) {
  console.error("Usage: SUPABASE_DB_PASSWORD=... node scripts/check-jobs-state.mjs");
  process.exit(1);
}

const db = new pg.Client({
  host: "aws-1-us-east-1.pooler.supabase.com",
  port: 6543,
  user: `postgres.${ref}`,
  password,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});
await db.connect();

const r = await db.query(`
  select id, status, assigned_washer_id, assigned_partner_id, requested_washer_id,
         scheduled_window_start, created_at
  from public.bookings
  order by created_at desc
  limit 30
`);
console.log("Recent bookings:");
for (const b of r.rows) {
  console.log(
    `  ${b.id.slice(0, 8)}  status=${b.status.padEnd(10)}  W=${b.assigned_washer_id?.slice(0, 8) || "—"}  P=${b.assigned_partner_id?.slice(0, 8) || "—"}  Req=${b.requested_washer_id?.slice(0, 8) || "—"}  start=${b.scheduled_window_start?.toISOString().slice(0, 16) || "—"}`
  );
}

const stuck = await db.query(`
  select count(*) from public.bookings
  where status = 'pending'
    and (assigned_washer_id is not null or assigned_partner_id is not null)
`);
console.log(`\nStuck rows (status=pending but already-assigned): ${stuck.rows[0].count}`);

const stale = await db.query(`
  select count(*) from public.bookings where status = 'pending'
`);
console.log(`Total pending: ${stale.rows[0].count}`);

await db.end();

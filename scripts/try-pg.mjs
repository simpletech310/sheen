#!/usr/bin/env node
// Probe direct-Postgres access against the Supabase project using each
// available secret as the password. Prints which (if any) connect.

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ref = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)[1];

const candidates = [
  ["service_role JWT", process.env.SUPABASE_SERVICE_ROLE_KEY],
  ["sb_secret", process.env.SUPABASE_SECRET_KEY],
  ["sb_publishable", process.env.SUPABASE_PUBLISHABLE_KEY],
];

const hosts = [
  ["direct", `db.${ref}.supabase.co`, 5432, "postgres"],
  ["pooler-east1", `aws-0-us-east-1.pooler.supabase.com`, 6543, `postgres.${ref}`],
  ["pooler-east2", `aws-0-us-east-2.pooler.supabase.com`, 6543, `postgres.${ref}`],
  ["pooler-west", `aws-0-us-west-1.pooler.supabase.com`, 6543, `postgres.${ref}`],
];

for (const [hLabel, host, port, user] of hosts) {
  for (const [label, password] of candidates) {
    if (!password) continue;
    const client = new pg.Client({
      host,
      port,
      user,
      password,
      database: "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });
    try {
      await client.connect();
      const res = await client.query("select current_user, version()");
      console.log(`✓ ${hLabel} (${host}:${port}) with ${label} → ${res.rows[0].current_user}`);
      await client.end();
      console.log(`\nUSE: PGHOST=${host} PGPORT=${port} PGUSER=${user} PGPASSWORD=${label}`);
      process.exit(0);
    } catch (e) {
      console.log(`✗ ${hLabel} ${label}: ${e.message}`);
      try { await client.end(); } catch {}
    }
  }
}
console.log("\nNo combination connected.");
process.exit(1);

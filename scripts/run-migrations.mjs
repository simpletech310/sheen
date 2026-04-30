#!/usr/bin/env node
// Apply migrations + seed against the Supabase Postgres directly.
// Reads DB_PASSWORD from arg or env, and PROJECT_REF from NEXT_PUBLIC_SUPABASE_URL.

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

const password = process.argv[2] || process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error("Usage: node scripts/run-migrations.mjs <DB_PASSWORD>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ref = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)[1];

const regions = [
  "us-east-1","us-east-2","us-west-1","us-west-2",
  "eu-west-1","eu-west-2","eu-west-3","eu-central-1","eu-central-2","eu-north-1",
  "ap-southeast-1","ap-southeast-2","ap-northeast-1","ap-northeast-2","ap-south-1",
  "sa-east-1","ca-central-1",
];
const hosts = [
  { label: "direct (5432)", host: `db.${ref}.supabase.co`, port: 5432, user: "postgres" },
  ...regions.flatMap((r) => [
    ["aws-0", "6543 tx", 6543],
    ["aws-1", "6543 tx", 6543],
    ["aws-0", "5432 sess", 5432],
    ["aws-1", "5432 sess", 5432],
  ].map(([prefix, mode, port]) => ({
    label: `${prefix}-${r} (${mode})`,
    host: `${prefix}-${r}.pooler.supabase.com`,
    port,
    user: `postgres.${ref}`,
  }))),
];

let client = null;
let usedHost = null;
for (const h of hosts) {
  const c = new pg.Client({
    host: h.host,
    port: h.port,
    user: h.user,
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    await c.connect();
    const r = await c.query("select current_user, current_database()");
    console.log(`✓ Connected via ${h.label} as ${r.rows[0].current_user}`);
    client = c;
    usedHost = h;
    break;
  } catch (e) {
    console.log(`✗ ${h.label}: ${e.message}`);
    try { await c.end(); } catch {}
  }
}

if (!client) {
  console.error("\nNo host accepted the password. Verify it in Supabase Dashboard → Settings → Database.");
  process.exit(1);
}

async function run(label, sql) {
  process.stdout.write(`Applying ${label} (${sql.length} chars)… `);
  try {
    await client.query(sql);
    console.log("✓");
  } catch (e) {
    console.log("✗");
    console.error(`\nError in ${label}:\n${e.message}`);
    if (e.position) console.error(`  near char ${e.position}`);
    throw e;
  }
}

// Bootstrap a tracking table so re-runs are idempotent
await client.query(`
  create table if not exists public._migrations (
    name text primary key,
    applied_at timestamptz default now()
  )
`);

// Back-fill: if any of the original tables already exist but the tracker is empty,
// mark 0001_init.sql and seed.sql as applied so we don't try to re-run them.
const introspect = await client.query(`
  select 1 from information_schema.tables where table_schema='public' and table_name='services' limit 1
`);
if (introspect.rowCount > 0) {
  await client.query(
    "insert into public._migrations (name) values ('0001_init.sql'), ('seed.sql') on conflict do nothing"
  );
}

async function isApplied(name) {
  const r = await client.query("select 1 from public._migrations where name = $1", [name]);
  return r.rowCount > 0;
}
async function markApplied(name) {
  await client.query("insert into public._migrations (name) values ($1) on conflict do nothing", [name]);
}

const migrations = fs
  .readdirSync(path.join(root, "supabase/migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort();

try {
  for (const f of migrations) {
    if (await isApplied(f)) {
      console.log(`Skipping ${f} (already applied)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(root, "supabase/migrations", f), "utf8");
    await run(f, sql);
    await markApplied(f);
  }
  const seedPath = path.join(root, "supabase/seed.sql");
  const seedKey = "seed.sql";
  if (fs.existsSync(seedPath) && !(await isApplied(seedKey))) {
    const sql = fs.readFileSync(seedPath, "utf8");
    await run(seedKey, sql);
    await markApplied(seedKey);
  } else if (fs.existsSync(seedPath)) {
    console.log(`Skipping seed.sql (already applied)`);
  }
  console.log(`\nAll done via ${usedHost.label}.`);
} catch {
  process.exitCode = 1;
} finally {
  await client.end();
}

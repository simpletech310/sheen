#!/usr/bin/env node
// One-shot migration runner. Reads .env.local, runs every .sql file in supabase/migrations
// then supabase/seed.sql against the live project via the SQL HTTP endpoint.
//
// Usage: node scripts/apply-migrations.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

// Load .env.local
const envPath = path.join(root, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] ||= m[2];
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

async function execSql(sql, label) {
  // Supabase exposes a built-in postgres-meta endpoint at /pg/query (or via studio API).
  // The most reliable path with just a service role JWT is to use the postgres metadata
  // endpoint exposed at https://<ref>.supabase.co/rest/v1/rpc/<function> — but raw SQL
  // requires the SQL editor API. Instead, we use the new query endpoint.
  const endpoint = `${url}/pg-meta/default/query`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${label} failed (${res.status}): ${body.slice(0, 800)}`);
  }
  return res.json().catch(() => ({}));
}

async function main() {
  const migrationsDir = path.join(root, "supabase/migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const f of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, f), "utf8");
    console.log(`Applying ${f} (${sql.length} chars)…`);
    await execSql(sql, f);
    console.log(`  ✓ ${f}`);
  }
  const seedPath = path.join(root, "supabase/seed.sql");
  if (fs.existsSync(seedPath)) {
    const sql = fs.readFileSync(seedPath, "utf8");
    console.log(`Applying seed.sql (${sql.length} chars)…`);
    await execSql(sql, "seed.sql");
    console.log("  ✓ seed.sql");
  }
  console.log("\nAll migrations applied.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

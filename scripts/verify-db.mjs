#!/usr/bin/env node
// Verify migrations applied: list tables, count rows in services + partner_profiles.

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

const password = process.argv[2];
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ref = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)[1];

const c = new pg.Client({
  host: `aws-1-us-east-1.pooler.supabase.com`,
  port: 6543,
  user: `postgres.${ref}`,
  password,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});
await c.connect();

const tables = await c.query(`
  select tablename from pg_tables where schemaname = 'public' order by tablename
`);
console.log("Tables in public:");
for (const r of tables.rows) console.log(`  - ${r.tablename}`);

const services = await c.query("select category, tier_name, base_price_cents from public.services order by sort_order");
console.log(`\nServices (${services.rows.length}):`);
for (const r of services.rows) console.log(`  ${r.category.padEnd(11)} ${r.tier_name.padEnd(22)} ${(r.base_price_cents / 100).toFixed(2)}`);

const partners = await c.query("select slug, business_name, status, is_founding from public.partner_profiles order by created_at");
console.log(`\nPartners (${partners.rows.length}):`);
for (const r of partners.rows) console.log(`  ${r.slug.padEnd(15)} ${r.business_name.padEnd(22)} ${r.status} ${r.is_founding ? "★ founding" : ""}`);

const policies = await c.query(`
  select tablename, count(*) as policies from pg_policies where schemaname = 'public' group by tablename order by tablename
`);
console.log(`\nRLS policies:`);
for (const r of policies.rows) console.log(`  ${r.tablename.padEnd(20)} ${r.policies}`);

await c.end();

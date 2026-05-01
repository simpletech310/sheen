import fs from "node:fs";
import path from "node:path";
import pg from "pg";
for (const line of fs.readFileSync("/Users/tj/Documents/Claude/Projects/sheen/.env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ||= m[2];
}
const ref = process.env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\./)[1];
const db = new pg.Client({
  host: "aws-1-us-east-1.pooler.supabase.com", port: 6543,
  user: `postgres.${ref}`, password: "oSMWMoYqgrioU3XI",
  database: "postgres", ssl: { rejectUnauthorized: false },
});
await db.connect();
const r = await db.query(`
  select u.email, a.day_of_week, a.start_time, a.end_time, a.specific_date, a.blocked
  from public.availability a
  join public.users u on u.id = a.washer_id
  where u.role='washer'
  order by u.email, a.day_of_week
`);
console.log(`Availability rows: ${r.rows.length}`);
for (const row of r.rows) {
  console.log(`  ${row.email}  d=${row.day_of_week}  ${row.start_time}-${row.end_time}  blocked=${row.blocked}`);
}
const c = await db.query(`select column_name, data_type, is_nullable from information_schema.columns where table_schema='public' and table_name='availability' order by ordinal_position`);
console.log("\nColumns:");
for (const col of c.rows) {
  console.log(`  ${col.column_name}  ${col.data_type}  null=${col.is_nullable}`);
}
await db.end();

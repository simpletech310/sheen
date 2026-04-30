#!/usr/bin/env node
// Provision the 3 SHEEN membership products + monthly recurring prices in
// Stripe TEST mode, then upsert the price IDs onto public.membership_plans.
// Idempotent — finds existing products by metadata.tier and reuses them.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ||= m[2];
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const ref = process.env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\./)[1];
const password = process.env.SUPABASE_DB_PASSWORD || process.argv[2];
if (!password) {
  console.error("Usage: SUPABASE_DB_PASSWORD=... node scripts/seed-stripe-products.mjs");
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

const plans = [
  { tier: "basic", name: "Sheen Basic",  cents: 5900,  desc: "2 Express OR 1 Full Detail per month." },
  { tier: "pro",   name: "Sheen Pro",    cents: 12900, desc: "4 Full Detail-tier washes per month." },
  { tier: "elite", name: "Sheen Elite",  cents: 24900, desc: "6 Premium-tier washes + priority booking." },
];

for (const p of plans) {
  // Find or create product
  const search = await stripe.products.search({ query: `metadata['tier']:'${p.tier}'`, limit: 1 });
  let product = search.data[0];
  if (!product) {
    product = await stripe.products.create({
      name: p.name,
      description: p.desc,
      metadata: { tier: p.tier },
    });
    console.log(`+ created product ${p.tier} (${product.id})`);
  } else {
    console.log(`= reusing product ${p.tier} (${product.id})`);
  }

  // Find or create monthly recurring price
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
  let price = prices.data.find((x) => x.unit_amount === p.cents && x.recurring?.interval === "month");
  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: p.cents,
      currency: "usd",
      recurring: { interval: "month" },
      nickname: p.name,
    });
    console.log(`+ created price ${p.tier} (${price.id})`);
  } else {
    console.log(`= reusing price ${p.tier} (${price.id})`);
  }

  await db.query(
    "update public.membership_plans set stripe_price_id = $1 where tier = $2",
    [price.id, p.tier]
  );
  console.log(`= linked price → membership_plans tier=${p.tier}`);
}

await db.end();
console.log("\nAll plans wired.");

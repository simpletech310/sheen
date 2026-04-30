#!/usr/bin/env node
// Provision Stripe products + monthly prices for the big-rig and combined
// membership plans, then write stripe_price_id back to membership_plans.
//
// Keys on display_name (stored in Stripe metadata.plan_key) because the
// big-rig plans reuse the 'basic' / 'pro' tier values that 0003_seed_plans
// already claimed. Fully idempotent — safe to re-run.

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
  console.error("Usage: SUPABASE_DB_PASSWORD=... node scripts/seed-stripe-bigrig-plans.mjs");
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
  {
    key: "rig_solo",
    display_name: "Rig Solo",
    name: "SHEEN+ Rig Solo",
    cents: 19900,
    desc: "1 Trailer Wash per month for owner-operators.",
  },
  {
    key: "rig_pro",
    display_name: "Rig Pro",
    name: "SHEEN+ Rig Pro",
    cents: 34900,
    desc: "2 big-rig washes per month up to Full Rig Detail.",
  },
  {
    key: "sheen_combined",
    display_name: "Sheen+ Combined",
    name: "SHEEN+ Combined (Auto + Big Rig)",
    cents: 19900,
    desc: "1 auto Premium Detail + 1 big-rig Trailer Wash per month.",
  },
];

for (const p of plans) {
  // Find or create product by metadata.plan_key (unique per plan).
  const search = await stripe.products.search({
    query: `metadata['plan_key']:'${p.key}'`,
    limit: 1,
  });
  let product = search.data[0];
  if (!product) {
    product = await stripe.products.create({
      name: p.name,
      description: p.desc,
      metadata: { plan_key: p.key },
    });
    console.log(`+ created product ${p.key} (${product.id})`);
  } else {
    console.log(`= reusing product ${p.key} (${product.id})`);
  }

  // Find or create monthly recurring price at the right amount.
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
  let price = prices.data.find(
    (x) => x.unit_amount === p.cents && x.recurring?.interval === "month"
  );
  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: p.cents,
      currency: "usd",
      recurring: { interval: "month" },
      nickname: p.name,
    });
    console.log(`+ created price ${p.key} (${price.id})`);
  } else {
    console.log(`= reusing price ${p.key} (${price.id})`);
  }

  // Match by display_name — tier is shared with the auto plans so we
  // can't use it as the unique key here.
  const r = await db.query(
    "update public.membership_plans set stripe_price_id = $1 where display_name = $2 returning id, display_name",
    [price.id, p.display_name]
  );
  if (r.rowCount === 0) {
    console.warn(`! no membership_plans row found for "${p.display_name}" — did 0013 run?`);
  } else {
    console.log(`= linked price → membership_plans display_name="${p.display_name}"`);
  }
}

await db.end();
console.log("\nBig-rig + combined plans wired.");

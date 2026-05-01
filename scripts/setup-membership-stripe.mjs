#!/usr/bin/env node
/**
 * One-shot script: provisions Stripe Products + Prices for Sheen+
 * promo and standard pricing, then writes the IDs into Supabase.
 *
 * Idempotent — uses Stripe `lookup_key` to find existing prices on
 * re-runs so it never duplicates. Safe to run repeatedly.
 *
 *   node scripts/setup-membership-stripe.mjs
 *
 * Reads STRIPE_SECRET_KEY + SUPABASE_SERVICE_ROLE_KEY +
 * NEXT_PUBLIC_SUPABASE_URL from .env.local.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// --- env loader (no dotenv dep) ---
function loadEnv(path) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const [, k, v] = m;
      if (process.env[k] != null) continue;
      process.env[k] = v.replace(/^["']|["']$/g, "");
    }
  } catch {}
}
loadEnv(resolve(process.cwd(), ".env.local"));
loadEnv(resolve(process.cwd(), ".env"));

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!STRIPE_KEY) throw new Error("STRIPE_SECRET_KEY missing");
if (!SUPA_URL || !SUPA_SERVICE) throw new Error("Supabase service env missing");

const stripe = new Stripe(STRIPE_KEY);
const supa = createClient(SUPA_URL, SUPA_SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- the catalogue we want to land in Stripe ---
// lookup_key is the idempotency handle — DO NOT change once shipped.
const PLANS = [
  {
    tier: "basic",
    productName: "Sheen+ Basic",
    productDescription: "4 Express OR 2 Full Detail per month. 2× points. Priority booking.",
    promo:    { lookup_key: "sheen_plus_basic_promo_v1",    amount_cents: 3900 },
    standard: { lookup_key: "sheen_plus_basic_standard_v1", amount_cents: 4900 },
  },
  {
    tier: "pro",
    productName: "Sheen+ Pro",
    productDescription: "4 Full Detail + 1 Premium per month. 3× points. Free Big Rig quarterly.",
    promo:    { lookup_key: "sheen_plus_pro_promo_v1",      amount_cents: 7900 },
    standard: { lookup_key: "sheen_plus_pro_standard_v1",   amount_cents: 9900 },
  },
];

// --- helpers ---
async function upsertProduct(name, description) {
  // Search for an existing product by exact name to avoid dupes.
  const search = await stripe.products.search({ query: `name:'${name}' AND active:'true'`, limit: 1 });
  if (search.data[0]) return search.data[0];
  return stripe.products.create({ name, description, metadata: { managed_by: "sheen-setup-script" } });
}

async function upsertPrice(productId, lookupKey, amountCents) {
  // Lookup keys are unique within an account — perfect idempotency handle.
  const found = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  if (found.data[0]) {
    const p = found.data[0];
    // Sanity-check: if amount drifted, leave the old price alone (you'd
    // need to ship a v2 lookup_key to rotate). Just warn loudly.
    if (p.unit_amount !== amountCents) {
      console.warn(
        `! ${lookupKey} exists at $${(p.unit_amount ?? 0) / 100} but config wants $${amountCents / 100} — ` +
          "skipping (rotate the lookup_key if you need a new amount)."
      );
    }
    return p;
  }
  return stripe.prices.create({
    product: productId,
    unit_amount: amountCents,
    currency: "usd",
    recurring: { interval: "month" },
    lookup_key: lookupKey,
    metadata: { managed_by: "sheen-setup-script" },
  });
}

// --- main ---
async function main() {
  console.log(`Stripe mode: ${STRIPE_KEY.startsWith("sk_live_") ? "LIVE" : "TEST"}`);
  for (const plan of PLANS) {
    console.log(`\n→ ${plan.productName}`);
    const product = await upsertProduct(plan.productName, plan.productDescription);
    console.log(`  product:  ${product.id}`);

    const promoPrice = await upsertPrice(product.id, plan.promo.lookup_key, plan.promo.amount_cents);
    console.log(`  promo:    ${promoPrice.id}  ($${plan.promo.amount_cents / 100}/mo)`);

    const stdPrice = await upsertPrice(product.id, plan.standard.lookup_key, plan.standard.amount_cents);
    console.log(`  standard: ${stdPrice.id}  ($${plan.standard.amount_cents / 100}/mo)`);

    const { error } = await supa
      .from("membership_plans")
      .update({
        stripe_price_id_promo: promoPrice.id,
        stripe_price_id_standard: stdPrice.id,
      })
      .eq("tier", plan.tier);
    if (error) {
      console.error(`  ✗ DB update failed: ${error.message}`);
      process.exitCode = 1;
    } else {
      console.log(`  ✓ wrote membership_plans row (tier=${plan.tier})`);
    }
  }

  console.log("\nDone. New signups during the promo window will see the promo price; existing $59/$129 subscribers stay grandfathered on whatever Price they were created against.");
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});

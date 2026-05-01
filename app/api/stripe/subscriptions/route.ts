import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ plan_id: z.string().uuid() });

/** POST /api/stripe/subscriptions
 *  Body: { plan_id }
 *  Creates a Stripe Checkout Session in subscription mode and returns its URL. */
export async function POST(req: Request) {
  const supabase = createClient();
  const stripe = getStripe();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = Body.parse(await req.json());

  const { data: plan } = await supabase
    .from("membership_plans")
    .select(
      "id, tier, stripe_price_id, stripe_price_id_promo, stripe_price_id_standard, monthly_price_cents, promo_price_cents, standard_price_cents, promo_until"
    )
    .eq("id", body.plan_id)
    .maybeSingle();
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  // Pick the right Stripe Price ID:
  // - promo Price if we're inside the promo window AND the promo Price exists
  // - else the standard Price
  // - fall back to the legacy `stripe_price_id` (the original $59/$129 product)
  //   so a half-migrated environment still works
  const inPromoWindow = !!plan.promo_until && new Date(plan.promo_until).getTime() > Date.now();
  const priceTier: "promo" | "standard" | "grandfathered" =
    inPromoWindow && plan.stripe_price_id_promo
      ? "promo"
      : plan.stripe_price_id_standard
      ? "standard"
      : "grandfathered";
  const stripePriceId =
    priceTier === "promo"
      ? plan.stripe_price_id_promo!
      : priceTier === "standard"
      ? plan.stripe_price_id_standard!
      : plan.stripe_price_id;
  if (!stripePriceId) {
    return NextResponse.json(
      { error: "Plan not configured — add a Stripe Price ID in /admin." },
      { status: 400 }
    );
  }

  // Find / create Stripe customer
  const { data: existing } = await supabase
    .from("memberships")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let customerId = existing?.stripe_customer_id;
  if (!customerId) {
    const cust = await stripe.customers.create({
      email: user.email!,
      metadata: { user_id: user.id },
    });
    customerId = cust.id;
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL("/", "http://localhost:3000").origin;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: stripePriceId, quantity: 1 }],
    success_url: `${origin}/app/membership?success=1`,
    cancel_url: `${origin}/app/membership?cancelled=1`,
    subscription_data: {
      metadata: { user_id: user.id, plan_id: plan.id, price_tier: priceTier },
    },
  });

  // Pre-create a draft membership row so the webhook just updates status.
  // is_promo_locked is the membership equivalent of Founder Lock — once set,
  // future code reading the row knows this customer keeps their promo rate.
  await supabase.from("memberships").upsert(
    {
      user_id: user.id,
      plan_id: plan.id,
      stripe_customer_id: customerId,
      status: "paused",
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 31 * 86400 * 1000).toISOString(),
      is_promo_locked: priceTier === "promo",
      price_tier: priceTier,
    },
    { onConflict: "user_id,plan_id" as any }
  );

  return NextResponse.json({ url: session.url });
}

/** DELETE /api/stripe/subscriptions
 *  Cancel at period end. */
export async function DELETE() {
  const supabase = createClient();
  const stripe = getStripe();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: m } = await supabase
    .from("memberships")
    .select("id, stripe_subscription_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!m?.stripe_subscription_id) {
    return NextResponse.json({ error: "No active subscription" }, { status: 404 });
  }

  await stripe.subscriptions.update(m.stripe_subscription_id, { cancel_at_period_end: true });
  await supabase.from("memberships").update({ cancel_at_period_end: true }).eq("id", m.id);

  return NextResponse.json({ ok: true });
}

/** PATCH /api/stripe/subscriptions
 *  Pause or resume the active subscription via Stripe pause_collection.
 *  Body: { action: "pause" | "resume" }
 */
export async function PATCH(req: Request) {
  const supabase = createClient();
  const stripe = getStripe();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = body?.action;
  if (action !== "pause" && action !== "resume") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { data: m } = await supabase
    .from("memberships")
    .select("id, stripe_subscription_id, status")
    .eq("user_id", user.id)
    .in("status", ["active", "paused", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!m?.stripe_subscription_id) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }

  if (action === "pause") {
    // pause_collection with behavior 'mark_uncollectible' — Stripe stops
    // billing but the subscription stays alive. Customer can resume any time.
    await stripe.subscriptions.update(m.stripe_subscription_id, {
      pause_collection: { behavior: "mark_uncollectible" } as any,
    });
    await supabase.from("memberships").update({ status: "paused" }).eq("id", m.id);
  } else {
    await stripe.subscriptions.update(m.stripe_subscription_id, {
      pause_collection: "" as any,
    });
    await supabase.from("memberships").update({ status: "active" }).eq("id", m.id);
  }

  return NextResponse.json({ ok: true, status: action === "pause" ? "paused" : "active" });
}

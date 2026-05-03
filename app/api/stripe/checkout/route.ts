import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ensurePublicUser } from "@/lib/auth";
import { getStripe } from "@/lib/stripe/server";
import { computeFees } from "@/lib/stripe/fees";
import { getAllowance, consumeAllowance } from "@/lib/membership";
import { snapshotAddons, sumAddonPrices, getAddonByCode } from "@/lib/addons";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  // Either pass an existing booking_id (re-collect payment) or all the new-booking
  // params we need to create a booking + PaymentIntent in one round-trip.
  booking_id: z.string().uuid().optional(),
  tier_name: z.string().optional(),
  // service_cents is the *total* (base × vehicle count) the client computed.
  service_cents: z.number().int().positive().optional(),
  category: z.enum(["auto", "home", "big_rig"]).default("auto"),
  vehicle_ids: z.array(z.string().uuid()).min(1).max(10).optional(),
  condition_photos: z.record(z.string(), z.array(z.string())).optional(),
  requested_wash_handle: z.string().min(3).max(20).optional(),
  redeem_points: z.number().int().min(0).optional(),
  // One-shot achievement freebie. We look it up server-side to verify it's
  // available and matches the booking's category + tier before zeroing out
  // the charge. Skipping if the credit doesn't fit.
  redeem_credit_id: z.string().uuid().optional(),
  address: z
    .object({
      street: z.string(),
      unit: z.string().optional(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
      lat: z.number().optional(),
      lng: z.number().optional(),
      notes: z.string().optional(),
      // Site access — has_water/has_power are required for the queue's
      // "can this washer take it?" filter. Null means the customer skipped
      // the question (older flow) and we treat it as "unknown — allow all".
      has_water: z.boolean().nullable().optional(),
      has_power: z.boolean().nullable().optional(),
      water_notes: z.string().optional(),
      power_notes: z.string().optional(),
      gate_code: z.string().optional(),
      site_photo_paths: z.array(z.string()).max(10).optional(),
    })
    .optional(),
  window: z.string().optional(),
  // ASAP / Rush — customer pays a small surcharge, we promise a pro
  // within 60 minutes. When set, the regular `window` field is
  // ignored (the booking gets a now/now+60 window).
  is_rush: z.boolean().default(false),
  // Detailing add-ons (auto + big_rig only) — codes from the catalog
  // the customer ticked on the addons step. Server re-snapshots prices
  // (NEVER trusts client-supplied price/payout) using vehicle_size for
  // the multiplier on premium add-ons.
  addon_codes: z.array(z.string()).max(20).optional(),
  vehicle_size: z.enum(["sedan", "suv", "truck"]).optional(),
});

function parseWindow(w: string): { start: Date; end: Date } {
  const [day, sH, eH] = w.split("_");
  const base = new Date();
  if (day === "tomorrow") base.setDate(base.getDate() + 1);
  const start = new Date(base);
  start.setHours(Number(sH), 0, 0, 0);
  const end = new Date(base);
  end.setHours(Number(eH), 0, 0, 0);
  return { start, end };
}

export async function POST(req: Request) {
  const supabase = createClient();
  const stripe = getStripe();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Make sure the public.users row exists before any FK-dependent insert
  // (bookings.customer_id, addresses.user_id, booking_vehicles, etc.).
  await ensurePublicUser(user);

  const body = Body.parse(await req.json());

  let bookingId = body.booking_id;
  let serviceCents: number;

  if (!bookingId) {
    // Rush bookings don't need an explicit window — we set one automatically.
    if (
      !body.tier_name ||
      !body.service_cents ||
      !body.address ||
      (!body.window && !body.is_rush)
    ) {
      return NextResponse.json({ error: "Missing booking fields" }, { status: 400 });
    }
    const usesVehicles = body.category === "auto" || body.category === "big_rig";
    if (usesVehicles) {
      if (!body.vehicle_ids || body.vehicle_ids.length === 0) {
        return NextResponse.json({ error: "Pick at least one vehicle" }, { status: 400 });
      }
      // Verify every vehicle belongs to this user AND its type matches the
      // booking category so a passenger car can't slip into a big-rig job
      // (or vice-versa).
      const requiredType = body.category === "big_rig" ? "big_rig" : "auto";
      const { data: ownedVehicles } = await supabase
        .from("vehicles")
        .select("id, vehicle_type")
        .eq("user_id", user.id)
        .in("id", body.vehicle_ids);
      const owned = ownedVehicles ?? [];
      if (owned.length !== body.vehicle_ids.length) {
        return NextResponse.json({ error: "One or more vehicles aren't yours" }, { status: 400 });
      }
      const wrongType = owned.find((v: any) => (v.vehicle_type ?? "auto") !== requiredType);
      if (wrongType) {
        return NextResponse.json(
          {
            error:
              requiredType === "big_rig"
                ? "Big-rig bookings need vehicles marked as 'Big rig' in your garage."
                : "Auto bookings need standard auto vehicles, not big rigs.",
          },
          { status: 400 }
        );
      }
    }
    // Look up service id
    const { data: svc } = await supabase
      .from("services")
      .select("id")
      .eq("category", body.category)
      .eq("tier_name", body.tier_name)
      .maybeSingle();
    if (!svc) return NextResponse.json({ error: "Unknown service" }, { status: 400 });

    const { data: addr } = await supabase
      .from("addresses")
      .insert({
        user_id: user.id,
        tag: "JOB",
        street: body.address.street + (body.address.unit ? ` ${body.address.unit}` : ""),
        city: body.address.city,
        state: body.address.state,
        zip: body.address.zip,
        lat: body.address.lat ?? null,
        lng: body.address.lng ?? null,
        notes: body.address.notes ?? null,
        has_water: body.address.has_water ?? null,
        has_power: body.address.has_power ?? null,
        water_notes: body.address.water_notes ?? null,
        power_notes: body.address.power_notes ?? null,
        gate_code: body.address.gate_code ?? null,
        site_photo_paths: body.address.site_photo_paths ?? [],
      })
      .select("id")
      .single();
    if (!addr) return NextResponse.json({ error: "Could not save address" }, { status: 400 });

    // Server-side addon snapshot — never trust client price math.
    // Codes are validated against the catalog; unknown codes are
    // dropped silently (matches snapshotAddons behaviour).
    const addonCodes =
      (body.addon_codes ?? []).filter((c) => !!getAddonByCode(c));
    // Big rig + auto only — home category never has add-ons.
    const addonsAllowed = body.category === "auto" || body.category === "big_rig";
    const vehicleSize = body.vehicle_size ?? "sedan";
    const serverAddons = addonsAllowed
      ? snapshotAddons(addonCodes, vehicleSize)
      : [];
    const addonTotal = sumAddonPrices(serverAddons);
    // service_cents the client sent is the base tier × vehicle_count.
    // Add the snapshotted add-ons on top to get the real service total.
    const totalServiceCents = body.service_cents + addonTotal;

    const fees = computeFees({ serviceCents: totalServiceCents, routedTo: "solo_washer" });
    // Rush: bypass the window picker and use now → +60min. Compute the
    // surcharge + bonus up front so the math is locked in even if the
    // RUSH_* constants change later.
    let start: Date;
    let end: Date;
    let rushSurchargeCents = 0;
    let rushBonusCents = 0;
    let rushDeadline: string | null = null;
    if (body.is_rush) {
      const { computeRushAmounts, RUSH_DEADLINE_MIN } = await import("@/lib/rush");
      start = new Date();
      end = new Date(start.getTime() + RUSH_DEADLINE_MIN * 60 * 1000);
      rushDeadline = end.toISOString();
      const amts = computeRushAmounts(body.service_cents);
      rushSurchargeCents = amts.customerSurchargeCents;
      rushBonusCents = amts.washerBonusCents;
    } else {
      const w = parseWindow(body.window!);
      start = w.start;
      end = w.end;
    }
    const vehicleIds = body.vehicle_ids ?? [];
    const vehicleCount = usesVehicles ? vehicleIds.length : 1;
    const primaryVehicleId = usesVehicles ? vehicleIds[0] : null;

    // Resolve direct request handle, if provided.
    // Use the service client — washer_profiles RLS only allows pros to
    // read their OWN row, so a user-context lookup of someone else's
    // handle returns null and surfaces as the misleading "No pro with
    // that wash ID" error. /api/washers/lookup already uses the service
    // client for the same reason.
    let requestedWasherId: string | null = null;
    let requestExpiresAt: string | null = null;
    if (body.requested_wash_handle) {
      const handle = body.requested_wash_handle
        .trim()
        .replace(/^@/, "")
        .toUpperCase();
      const svc = createServiceClient();
      const { data: requestedWasher } = await svc
        .from("washer_profiles")
        .select("user_id, status")
        .eq("wash_handle", handle)
        .maybeSingle();
      if (!requestedWasher) {
        return NextResponse.json({ error: "No pro with that wash ID" }, { status: 400 });
      }
      if (requestedWasher.status !== "active") {
        return NextResponse.json({ error: "That pro isn't accepting jobs" }, { status: 400 });
      }
      requestedWasherId = requestedWasher.user_id;
      // 10-minute exclusive window for the requested pro to accept. The RLS
      // policy in 0008_direct_request_and_self_service.sql hides the booking
      // from every other washer until the window expires or they decline,
      // so this single timestamp drives both visibility and accept-eligibility.
      requestExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    }

    // Loyalty redemption: 100 points = $1. Bounded to wallet balance and
    // the booking's pre-fee total so customers can't go negative or get
    // a refund out of the trust fee.
    let discountCents = 0;
    let pointsRedeemed = 0;
    if (body.redeem_points && body.redeem_points > 0) {
      const { data: ledger } = await supabase
        .from("loyalty_ledger")
        .select("points")
        .eq("user_id", user.id);
      const balance = (ledger ?? []).reduce((acc, r: any) => acc + (r.points ?? 0), 0);
      const requested = Math.min(body.redeem_points, balance);
      const requestedDollars = Math.floor(requested / 100);
      // Max we can discount is the service amount (not the trust fee).
      const maxDiscountCents = Math.floor(fees.serviceCents);
      discountCents = Math.min(requestedDollars * 100, maxDiscountCents);
      pointsRedeemed = discountCents; // 100 pts → $1, so cents == pts redeemed
    }

    // Achievement perks: founder/ride-or-die/comeback-kid grant a forever %
    // off. We greatest-wins so multiple unlocks don't compound — applied to
    // the service price only, never the trust fee or the rush surcharge.
    let perkDiscountPct = 0;
    {
      const { data: perks } = await supabase
        .from("customer_perks")
        .select("discount_pct")
        .eq("user_id", user.id)
        .maybeSingle();
      perkDiscountPct = perks?.discount_pct ?? 0;
    }
    const perkDiscountCents = Math.round((fees.serviceCents * perkDiscountPct) / 100);
    discountCents += perkDiscountCents;

    // Achievement freebie: a one-shot credit covers the entire service
    // charge for a matching tier+category. Validated against the catalog
    // and reserved against this booking; redeemed on funds release, freed
    // on cancellation.
    let creditApplied: { id: string } | null = null;
    if (body.redeem_credit_id) {
      const { data: credit } = await supabase
        .from("customer_credits")
        .select("id, kind, service_category, service_tier_name, status")
        .eq("id", body.redeem_credit_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (
        credit &&
        credit.status === "available" &&
        credit.kind === "free_wash" &&
        credit.service_category === body.category &&
        credit.service_tier_name === body.tier_name
      ) {
        creditApplied = { id: credit.id };
      } else {
        return NextResponse.json(
          { error: "That credit doesn't apply to this booking." },
          { status: 400 }
        );
      }
    }

    // Check membership allowance — if covered, the booking is created with
    // total_cents=0 and we skip Stripe checkout entirely. Membership covers
    // a single wash; multi-vehicle bookings still pay for the extras.
    const allowance = await getAllowance(user.id, body.tier_name, body.category);
    const isCoveredByMembership =
      !creditApplied &&
      allowance.canCoverTier &&
      allowance.membershipId !== null &&
      vehicleCount === 1 &&
      pointsRedeemed === 0;
    const isCoveredByCredit = !!creditApplied && vehicleCount === 1;

    // Rush surcharge sits on top of the regular charge — never
    // covered by membership and never reduced by points (those would
    // defeat the "pay extra to skip the queue" idea).
    const baseCharge = (isCoveredByMembership || isCoveredByCredit) ? 0 : fees.customerCharge - discountCents;
    const finalCustomerCharge = Math.max(0, baseCharge) + rushSurchargeCents;

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .insert({
        customer_id: user.id,
        service_id: svc.id,
        address_id: addr.id,
        vehicle_id: primaryVehicleId,
        vehicle_count: vehicleCount,
        scheduled_window_start: start.toISOString(),
        scheduled_window_end: end.toISOString(),
        service_cents: fees.serviceCents,
        fees_cents: isCoveredByMembership ? 0 : fees.trustFee,
        total_cents: finalCustomerCharge,
        discount_cents: discountCents,
        points_redeemed: pointsRedeemed,
        status: "pending",
        customer_note: body.address.notes ?? null,
        membership_id: isCoveredByMembership ? allowance.membershipId : null,
        requested_washer_id: requestedWasherId,
        request_expires_at: requestExpiresAt,
        is_rush: body.is_rush,
        rush_deadline: rushDeadline,
        rush_surcharge_cents: rushSurchargeCents,
        rush_bonus_cents: rushBonusCents,
      })
      .select("id, total_cents, service_cents")
      .single();
    if (bookingErr || !booking) return NextResponse.json({ error: bookingErr?.message ?? "Booking failed" }, { status: 400 });

    bookingId = booking.id;
    serviceCents = booking.service_cents;

    // Loyalty redemption ledger entry (negative points).
    if (pointsRedeemed > 0) {
      await supabase.from("loyalty_ledger").insert({
        user_id: user.id,
        points: -pointsRedeemed,
        reason: "redeem",
        booking_id: bookingId,
      });
    }

    // Reserve the achievement credit against the booking. It moves to
    // 'redeemed' on funds release and back to 'available' on cancellation —
    // both transitions live next to the rest of the booking state machine.
    if (creditApplied) {
      await supabase
        .from("customer_credits")
        .update({ status: "reserved", reserved_for_booking_id: bookingId })
        .eq("id", creditApplied.id);
    }

    // Notify the requested pro that they have 10 minutes to accept.
    if (requestedWasherId) {
      const { sendPushToUser } = await import("@/lib/push");
      sendPushToUser(requestedWasherId, {
        title: "You were requested",
        body: "A customer asked for you. 10 minutes to accept.",
        url: `/pro/queue/${bookingId}`,
        tag: `request-${bookingId}`,
      }).catch(() => {});
    }

    // Persist add-on snapshots so receipts + queue cards + the payout
    // breakdown can rebuild line items even if the catalog mutates
    // later. The bookings.service_cents already includes the addon
    // total above, so the existing payout pipeline stays unchanged —
    // these rows are display-only.
    if (serverAddons.length > 0) {
      const { data: addonRows } = await supabase
        .from("service_addons")
        .select("id, code, name")
        .in("code", serverAddons.map((a) => a.code));
      const byCode: Record<string, { id: string; name: string }> = {};
      for (const row of addonRows ?? []) {
        byCode[row.code] = { id: row.id, name: row.name };
      }
      const insertRows = serverAddons
        .filter((a) => byCode[a.code])
        .map((a) => ({
          booking_id: bookingId!,
          addon_id: byCode[a.code].id,
          addon_code: a.code,
          addon_name: byCode[a.code].name,
          price_cents: a.price_cents,
          washer_payout_cents: a.washer_payout_cents,
          duration_minutes: a.duration_minutes,
          size_multiplier: a.size_multiplier,
        }));
      if (insertRows.length > 0) {
        await supabase.from("booking_addons").insert(insertRows);
      }
    }

    // Insert booking_vehicles join rows with per-vehicle pre-wash photos.
    // Home services skip this — there's no vehicle to attach.
    if (usesVehicles && vehicleIds.length > 0) {
      const photoMap = body.condition_photos ?? {};
      const bvRows = vehicleIds.map((vid) => ({
        booking_id: bookingId!,
        vehicle_id: vid,
        condition_photo_paths: photoMap[vid] ?? [],
      }));
      const { error: bvErr } = await supabase.from("booking_vehicles").insert(bvRows);
      if (bvErr) {
        // Roll the booking back so the customer doesn't end up with a broken row.
        await supabase.from("bookings").delete().eq("id", bookingId!);
        return NextResponse.json({ error: `Could not save vehicles: ${bvErr.message}` }, { status: 400 });
      }
    }

    await supabase.from("booking_events").insert({
      booking_id: bookingId,
      type: "created",
      actor_id: user.id,
      payload: {
        tier: body.tier_name,
        total_cents: booking.total_cents,
        covered_by_membership: isCoveredByMembership,
      },
    });

    // If membership covers it, debit allowance and short-circuit (no Stripe).
    if (isCoveredByMembership) {
      await consumeAllowance(allowance.membershipId!);
      // Mark the booking as paid immediately by flipping status from pending → matched
      // happens later when a washer claims it. No PaymentIntent needed.
      return NextResponse.json({
        booking_id: bookingId,
        client_secret: null,
        amount_cents: 0,
        covered_by_membership: true,
      });
    }

    // Achievement freebie covers it — same short-circuit, no Stripe charge.
    // The credit row stays 'reserved' until release marks it 'redeemed'.
    if (isCoveredByCredit) {
      return NextResponse.json({
        booking_id: bookingId,
        client_secret: null,
        amount_cents: 0,
        covered_by_credit: true,
      });
    }
  } else {
    const { data: existing } = await supabase
      .from("bookings")
      .select("id, customer_id, service_cents, total_cents, status")
      .eq("id", bookingId)
      .maybeSingle();
    if (!existing || existing.customer_id !== user.id) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    serviceCents = existing.service_cents;
  }

  const fees = computeFees({ serviceCents, routedTo: "solo_washer" });

  // Create or fetch a Stripe Customer for this user (so saved cards persist).
  await supabase
    .from("customer_profiles")
    .select("default_payment_method_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let stripeCustomerId: string;
  const { data: existingMembership } = await supabase
    .from("memberships")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingMembership?.stripe_customer_id) {
    stripeCustomerId = existingMembership.stripe_customer_id;
  } else {
    const cust = await stripe.customers.create({
      email: user.email!,
      metadata: { user_id: user.id },
    });
    stripeCustomerId = cust.id;
  }

  // Re-read the booking to get the final total_cents (after discount).
  const { data: finalBooking } = await supabase
    .from("bookings")
    .select("total_cents")
    .eq("id", bookingId!)
    .maybeSingle();
  const chargeAmount = finalBooking?.total_cents ?? fees.customerCharge;

  // Stripe requires amount >= 50¢. If the customer redeemed enough points
  // to fully cover the wash, short-circuit without a PaymentIntent.
  if (chargeAmount < 50) {
    return NextResponse.json({
      booking_id: bookingId,
      client_secret: null,
      amount_cents: chargeAmount,
      covered_by_membership: false,
      covered_by_loyalty: true,
    });
  }

  const intent = await stripe.paymentIntents.create({
    amount: chargeAmount,
    currency: "usd",
    customer: stripeCustomerId,
    automatic_payment_methods: { enabled: true },
    setup_future_usage: "off_session",
    metadata: { booking_id: bookingId!, user_id: user.id },
  });

  await supabase
    .from("bookings")
    .update({ stripe_payment_intent_id: intent.id })
    .eq("id", bookingId!);

  return NextResponse.json({
    booking_id: bookingId,
    client_secret: intent.client_secret,
    amount_cents: chargeAmount,
  });
}

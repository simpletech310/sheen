// Sheen platform penalty rules.
//
// All amounts are in cents. Each rule says:
//   - who pays (party)
//   - reason code (matches penalties.reason)
//   - flat amount, or a percentage of the booking total_cents
//   - whether the platform OR the counterparty receives the fee.
//     For now the fee is always recorded as a penalty row. App logic
//     handles the actual money movement (e.g. holding the customer
//     refund for late cancel).
//
// These numbers are conservative defaults — admin can waive any row.

export type PenaltyRule = {
  reason: string;
  party: "customer" | "washer" | "partner";
  // Either flat dollars or a percentage of the booking total. The bigger
  // of the two is taken when both are set.
  flatCents?: number;
  percent?: number;
  /** Maximum dollars that can be charged on this rule. */
  capCents?: number;
  description: string;
};

export const PENALTY_RULES = {
  /* ---------- Customer-side ---------- */

  // Cancelled within 1 hour of the window — pro is already prepping.
  late_cancel: {
    reason: "late_cancel",
    party: "customer",
    flatCents: 1500, // $15
    description: "Cancelled within 1 hour of the window",
  } as PenaltyRule,

  // Cancelled after the pro is en route or has arrived. Heavier.
  late_cancel_after_enroute: {
    reason: "late_cancel_after_enroute",
    party: "customer",
    flatCents: 2500, // $25
    description: "Cancelled after the pro was on the way",
  } as PenaltyRule,

  // Pro arrived but customer was unavailable / no one on site.
  customer_no_show: {
    reason: "customer_no_show",
    party: "customer",
    percent: 100, // full price kept
    description: "Pro arrived; customer unavailable",
  } as PenaltyRule,

  // Customer's site has no working water spigot. Pro made the trip.
  no_water: {
    reason: "no_water",
    party: "customer",
    flatCents: 2500,
    description: "No working water on site",
  } as PenaltyRule,

  // Customer's site has no power for pressure washer / vacuum.
  no_power: {
    reason: "no_power",
    party: "customer",
    flatCents: 2500,
    description: "No working power on site",
  } as PenaltyRule,

  // Site is unsafe (active construction, hostile dog, etc.) — pro can decline.
  site_unsafe: {
    reason: "site_unsafe",
    party: "customer",
    flatCents: 2500,
    description: "Site flagged as unsafe by the pro",
  } as PenaltyRule,

  /* ---------- Washer-side ---------- */

  // Pro cancelled after claiming. Inconveniences the customer.
  pro_cancel: {
    reason: "pro_cancel",
    party: "washer",
    flatCents: 500, // $5 to platform, plus reputation hit
    description: "Cancelled after claiming the job",
  } as PenaltyRule,

  // Pro never showed up — biggest customer-trust hit.
  pro_no_show: {
    reason: "pro_no_show",
    party: "washer",
    flatCents: 2500,
    description: "Did not arrive for the booking",
  } as PenaltyRule,

  // Pro arrived more than 30 min after the window started.
  pro_late: {
    reason: "pro_late",
    party: "washer",
    flatCents: 500, // $5 service credit funded by the pro
    description: "Arrived 30+ minutes late",
  } as PenaltyRule,
} as const;

export type PenaltyKey = keyof typeof PENALTY_RULES;

export function computePenaltyAmount(rule: PenaltyRule, totalCents: number) {
  const flat = rule.flatCents ?? 0;
  const pct = rule.percent ? Math.floor((totalCents * rule.percent) / 100) : 0;
  let amount = Math.max(flat, pct);
  if (rule.capCents) amount = Math.min(amount, rule.capCents);
  return amount;
}

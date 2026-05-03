// Add-on catalog mirror + booking-time math.
//
// Source of truth lives in the DB (service_addons table, seeded by
// migration 0033). This file mirrors the catalog so the booking UI
// can render add-ons without an extra round-trip, and so the
// vehicle-size multiplier math is shared between client + server.
//
// If you change a price, capability, or tier here, change the seed
// migration too — and ship a follow-up migration to update existing
// rows. Codes are forever; renaming one orphans every booking_addons
// row that references it.

import type { Tier } from "@/lib/tier";
import { tierRank } from "@/lib/tier";

export type AddonCategory = "auto" | "big_rig";
export type VehicleSize = "sedan" | "suv" | "truck";

export type Addon = {
  code: string;
  category: AddonCategory;
  name: string;
  short_desc: string;
  base_price_cents: number;
  washer_payout_cents: number;
  duration_minutes: number;
  required_capability: string;
  required_tier: Tier;
  // null = compatible with every tier in the category
  compatible_tiers: string[] | null;
  size_multiplier_applies: boolean;
  sort_order: number;
};

export const SIZE_MULTIPLIER: Record<VehicleSize, number> = {
  sedan: 1.0,
  suv: 1.25,
  truck: 1.5,
};

// Catalog mirror — keep aligned with 0033_seed_service_addons.sql.
export const AUTO_ADDONS: Addon[] = [
  {
    code: "tire_shine_plus",
    category: "auto",
    name: "Premium tire dressing",
    short_desc: "Long-lasting gel dressing — wet-look tires for 2+ weeks.",
    base_price_cents: 1900,
    washer_payout_cents: 1482,
    duration_minutes: 10,
    required_capability: "tire_shine_plus",
    required_tier: "rookie",
    compatible_tiers: null,
    size_multiplier_applies: false,
    sort_order: 10,
  },
  {
    code: "pet_hair",
    category: "auto",
    name: "Pet hair extraction",
    short_desc: "Rubber-brush + extractor pass on seats & carpet. Goodbye fur.",
    base_price_cents: 3900,
    washer_payout_cents: 3042,
    duration_minutes: 25,
    required_capability: "pet_hair",
    required_tier: "rookie",
    compatible_tiers: null,
    size_multiplier_applies: false,
    sort_order: 20,
  },
  {
    code: "hand_wax",
    category: "auto",
    name: "Hand wax (carnauba)",
    short_desc: "Premium carnauba wax, hand-applied. 2-3 month gloss + protection.",
    base_price_cents: 5900,
    washer_payout_cents: 4602,
    duration_minutes: 30,
    required_capability: "hand_wax",
    required_tier: "rookie",
    compatible_tiers: ["Express Wash", "Full Detail"],
    size_multiplier_applies: false,
    sort_order: 30,
  },
  {
    code: "bug_tar_removal",
    category: "auto",
    name: "Bug & tar removal",
    short_desc: "Front-end deep clean — bumper, grille, mirrors. Safe on clear coat.",
    base_price_cents: 4900,
    washer_payout_cents: 3822,
    duration_minutes: 25,
    required_capability: "bug_tar_removal",
    required_tier: "rookie",
    compatible_tiers: null,
    size_multiplier_applies: false,
    sort_order: 40,
  },
  {
    code: "leather_treatment",
    category: "auto",
    name: "Leather clean + condition",
    short_desc: "Deep clean + UV-protective conditioner on all leather surfaces.",
    base_price_cents: 4900,
    washer_payout_cents: 3822,
    duration_minutes: 30,
    required_capability: "leather_treatment",
    required_tier: "pro",
    compatible_tiers: null,
    size_multiplier_applies: false,
    sort_order: 50,
  },
  {
    code: "engine_bay",
    category: "auto",
    name: "Engine bay degrease + dress",
    short_desc: "Degrease, rinse, low-pressure detail. Plastics dressed, not greasy.",
    base_price_cents: 5900,
    washer_payout_cents: 4602,
    duration_minutes: 30,
    required_capability: "engine_bay",
    required_tier: "pro",
    compatible_tiers: null,
    size_multiplier_applies: false,
    sort_order: 60,
  },
  {
    code: "clay_bar",
    category: "auto",
    name: "Clay-bar decontamination",
    short_desc: "Removes embedded contaminants paint wash can't touch. Glass-smooth finish.",
    base_price_cents: 6900,
    washer_payout_cents: 5382,
    duration_minutes: 40,
    required_capability: "clay_bar",
    required_tier: "pro",
    compatible_tiers: ["Express Wash", "Full Detail"],
    size_multiplier_applies: false,
    sort_order: 70,
  },
  {
    code: "headlight_restore",
    category: "auto",
    name: "Headlight restoration",
    short_desc: "Sand, polish, seal both headlights. Foggy to crystal clear.",
    base_price_cents: 8900,
    washer_payout_cents: 6942,
    duration_minutes: 45,
    required_capability: "headlight_restore",
    required_tier: "pro",
    compatible_tiers: null,
    size_multiplier_applies: false,
    sort_order: 80,
  },
  {
    code: "interior_shampoo",
    category: "auto",
    name: "Carpet & upholstery shampoo",
    short_desc: "Hot-water extraction on carpets, mats, cloth seats. Stains lifted.",
    base_price_cents: 7900,
    washer_payout_cents: 6162,
    duration_minutes: 45,
    required_capability: "interior_shampoo",
    required_tier: "pro",
    compatible_tiers: null,
    size_multiplier_applies: true,
    sort_order: 90,
  },
  {
    code: "ozone_treatment",
    category: "auto",
    name: "Ozone odor treatment",
    short_desc: "60-minute ozone cycle eliminates smoke, pet, food odors at the source.",
    base_price_cents: 7900,
    washer_payout_cents: 6162,
    duration_minutes: 60,
    required_capability: "ozone_treatment",
    required_tier: "pro",
    compatible_tiers: null,
    size_multiplier_applies: true,
    sort_order: 100,
  },
  {
    code: "ceramic_seal",
    category: "auto",
    name: "6-month ceramic spray seal",
    short_desc: "SiO2 spray sealant — 6 months of beading + UV protection.",
    base_price_cents: 12900,
    washer_payout_cents: 10062,
    duration_minutes: 45,
    required_capability: "ceramic_seal",
    required_tier: "elite",
    compatible_tiers: ["Express Wash", "Full Detail", "Premium Detail"],
    size_multiplier_applies: true,
    sort_order: 110,
  },
  {
    code: "paint_correction",
    category: "auto",
    name: "1-step paint correction",
    short_desc: "Compound + polish removes swirls, light scratches. Paint reset.",
    base_price_cents: 24900,
    washer_payout_cents: 19422,
    duration_minutes: 120,
    required_capability: "paint_correction",
    required_tier: "elite",
    compatible_tiers: ["Express Wash", "Full Detail", "Premium Detail"],
    size_multiplier_applies: true,
    sort_order: 120,
  },
  {
    code: "ceramic_pro",
    category: "auto",
    name: "2-year ceramic coating",
    short_desc: "Pro-grade ceramic coating, 2-year warranty. Ultimate gloss + protection.",
    base_price_cents: 39900,
    washer_payout_cents: 31122,
    duration_minutes: 180,
    required_capability: "ceramic_pro",
    required_tier: "legend",
    compatible_tiers: null,
    size_multiplier_applies: true,
    sort_order: 130,
  },
];

export const BIG_RIG_ADDONS: Addon[] = [
  {
    code: "bug_tar_rig",
    category: "big_rig",
    name: "Front-end bug & tar removal",
    short_desc: "Cab front, grille, bumpers. Highway grime stripped.",
    base_price_cents: 7900,
    washer_payout_cents: 6162,
    duration_minutes: 30,
    required_capability: "bug_tar_rig",
    required_tier: "rookie",
    compatible_tiers: null,
    size_multiplier_applies: false,
    sort_order: 10,
  },
  {
    code: "degrease_undercarriage",
    category: "big_rig",
    name: "Undercarriage degrease",
    short_desc: "High-pressure degrease — frame, tanks, fifth wheel. Extends component life.",
    base_price_cents: 9900,
    washer_payout_cents: 7722,
    duration_minutes: 45,
    required_capability: "degrease_undercarriage",
    required_tier: "pro",
    compatible_tiers: null,
    size_multiplier_applies: false,
    sort_order: 20,
  },
  {
    code: "cab_shampoo",
    category: "big_rig",
    name: "Cab carpet shampoo",
    short_desc: "Hot-water extraction on cab carpets, floor mats, cloth seats.",
    base_price_cents: 12900,
    washer_payout_cents: 10062,
    duration_minutes: 60,
    required_capability: "cab_shampoo",
    required_tier: "pro",
    compatible_tiers: null,
    size_multiplier_applies: false,
    sort_order: 30,
  },
  {
    code: "aluminum_wheel_polish",
    category: "big_rig",
    name: "Aluminum wheel polish",
    short_desc: "Cut, polish, seal aluminum wheels. Mirror finish, all axles.",
    base_price_cents: 14900,
    washer_payout_cents: 11622,
    duration_minutes: 90,
    required_capability: "aluminum_wheel_polish",
    required_tier: "elite",
    compatible_tiers: null,
    size_multiplier_applies: false,
    sort_order: 40,
  },
  {
    code: "sleeper_deep_clean",
    category: "big_rig",
    name: "Sleeper deep-clean",
    short_desc: "Bedding-out, full vacuum, surfaces wiped, ozone optional. Reset for the road.",
    base_price_cents: 17900,
    washer_payout_cents: 13962,
    duration_minutes: 90,
    required_capability: "sleeper_deep_clean",
    required_tier: "elite",
    compatible_tiers: null,
    size_multiplier_applies: false,
    sort_order: 50,
  },
  {
    code: "chrome_polish_premium",
    category: "big_rig",
    name: "Premium chrome polish",
    short_desc: "Acid wash + cut + polish + seal on stacks, tanks, bumpers. Show-truck shine.",
    base_price_cents: 19900,
    washer_payout_cents: 15522,
    duration_minutes: 120,
    required_capability: "chrome_polish_premium",
    required_tier: "elite",
    compatible_tiers: ["Rig Rinse", "Trailer Wash", "Full Rig Detail"],
    size_multiplier_applies: false,
    sort_order: 60,
  },
  {
    code: "ceramic_seal_rig",
    category: "big_rig",
    name: "Ceramic spray seal (cab + trailer)",
    short_desc: "SiO2 sealant on cab + trailer panels. Hydrophobic finish, easier washes.",
    base_price_cents: 29900,
    washer_payout_cents: 23322,
    duration_minutes: 90,
    required_capability: "ceramic_seal_rig",
    required_tier: "elite",
    compatible_tiers: ["Rig Rinse", "Trailer Wash", "Full Rig Detail"],
    size_multiplier_applies: false,
    sort_order: 70,
  },
];

export const ALL_ADDONS: Addon[] = [...AUTO_ADDONS, ...BIG_RIG_ADDONS];

const ADDON_BY_CODE: Record<string, Addon> = Object.fromEntries(
  ALL_ADDONS.map((a) => [a.code, a])
);

export function getAddonByCode(code: string): Addon | undefined {
  return ADDON_BY_CODE[code];
}

export function getAddonsForCategory(category: AddonCategory): Addon[] {
  return ALL_ADDONS.filter((a) => a.category === category).sort(
    (a, b) => a.sort_order - b.sort_order
  );
}

// Filter the catalog down to add-ons a customer can actually pick
// for a given base tier (drops add-ons whose function is already
// inside the tier — e.g. paint_correction inside Showroom).
export function getCompatibleAddons(
  category: AddonCategory,
  baseTierName: string
): Addon[] {
  return getAddonsForCategory(category).filter(
    (a) => a.compatible_tiers === null || a.compatible_tiers.includes(baseTierName)
  );
}

// Filter the catalog down to what a washer is ALLOWED to claim
// (tier high enough AND capability flag set on profile). Used in
// the queue + claim eligibility checks. The customer-side picker
// uses getCompatibleAddons — we don't hide tiered addons from the
// customer just because *some* washers can't do them.
export function getEligibleAddonsForWasher(
  tier: Tier,
  capabilities: Record<string, boolean>,
  category: AddonCategory
): Addon[] {
  const myRank = tierRank(tier);
  return getAddonsForCategory(category).filter(
    (a) => tierRank(a.required_tier) <= myRank && capabilities[a.required_capability] === true
  );
}

export type SelectedAddon = {
  code: string;
  // Final, vehicle-size-adjusted price/payout/duration. Snapshotted
  // into booking_addons at checkout time.
  price_cents: number;
  washer_payout_cents: number;
  duration_minutes: number;
  size_multiplier: number;
};

// Takes a list of addon codes + the customer's vehicle size, returns
// SelectedAddon snapshots ready for the checkout payload + booking_addons
// inserts. Unknown codes are dropped silently — the API layer is the
// gatekeeper for "is this addon still in the catalog".
export function snapshotAddons(
  codes: string[],
  size: VehicleSize
): SelectedAddon[] {
  const mult = SIZE_MULTIPLIER[size];
  const out: SelectedAddon[] = [];
  for (const code of codes) {
    const a = ADDON_BY_CODE[code];
    if (!a) continue;
    const m = a.size_multiplier_applies ? mult : 1.0;
    out.push({
      code: a.code,
      price_cents: Math.round(a.base_price_cents * m),
      washer_payout_cents: Math.round(a.washer_payout_cents * m),
      duration_minutes: Math.round(a.duration_minutes * m),
      size_multiplier: m,
    });
  }
  return out;
}

// Sum addon prices into the booking total. Caller adds this to the
// base tier price to get the final service_cents for computeFees.
export function sumAddonPrices(addons: SelectedAddon[]): number {
  return addons.reduce((acc, a) => acc + a.price_cents, 0);
}

export function sumAddonPayouts(addons: SelectedAddon[]): number {
  return addons.reduce((acc, a) => acc + a.washer_payout_cents, 0);
}

export function sumAddonDuration(addons: SelectedAddon[]): number {
  return addons.reduce((acc, a) => acc + a.duration_minutes, 0);
}

export type ServiceCategory = "auto" | "home" | "commercial" | "big_rig";

export type Service = {
  id?: string;
  category: ServiceCategory;
  tier_name: string;
  base_price_cents: number;          // promo price during launch
  standard_price_cents?: number;     // anchor / "what it'll be"
  duration_minutes: number;
  description: string;
  included: string[];
};

// Pricing matches migration 0023_promo_pricing.sql. If you change one,
// change the other — the marketing pages render from these constants but
// the booking engine reads from the DB.
export const AUTO_TIERS: Service[] = [
  {
    category: "auto",
    tier_name: "Express Wash",
    base_price_cents: 2400,
    standard_price_cents: 2900,
    duration_minutes: 30,
    description: "Hand-wash, dressed wheels, streak-free glass — the weekly upkeep wash.",
    included: ["Foam pre-soak", "Hand wash", "Dressed wheels & tires", "Streak-free glass", "Door jambs"],
  },
  {
    category: "auto",
    tier_name: "Full Detail",
    base_price_cents: 4900,
    standard_price_cents: 5900,
    duration_minutes: 60,
    description: "Express plus a full interior reset — looks new, smells new.",
    included: [
      "Everything in Express",
      "Interior vacuum (seats, mats, carpet)",
      "Dash, console, vents wiped",
      "Mats lifted & cleaned",
    ],
  },
  {
    category: "auto",
    tier_name: "Premium Detail",
    base_price_cents: 8900,
    standard_price_cents: 10900,
    duration_minutes: 90,
    description: "Decontamination, hand wax, leather conditioning — gloss that holds for months.",
    included: [
      "Everything in Full",
      "Clay-bar paint decontamination",
      "Hand-applied wax",
      "Leather conditioning",
      "Two-bucket method, microfiber per panel",
    ],
  },
  {
    category: "auto",
    tier_name: "Showroom",
    base_price_cents: 15900,
    standard_price_cents: 18900,
    duration_minutes: 180,
    description: "Paint correction, ceramic top-up, the works — concours-ready, every angle.",
    included: [
      "Everything in Premium",
      "Paint correction (compound + polish)",
      "Ceramic top-up coating",
      "Engine bay detail",
      "Final walk-around with you",
    ],
  },
];

export const HOME_TIERS: Service[] = [
  {
    category: "home",
    tier_name: "Driveway & Walkway",
    base_price_cents: 12900,
    standard_price_cents: 15900,
    duration_minutes: 90,
    description: "Pressure-wash up to 800 sq ft. Oil-spot pre-treat, concrete-safe rinse.",
    included: ["Driveway", "Walkway", "Oil-spot pre-treatment", "Surface streak removal"],
  },
  {
    category: "home",
    tier_name: "Deck or Patio",
    base_price_cents: 7900,
    standard_price_cents: 9500,
    duration_minutes: 60,
    description: "Wood-safe pH soft-wash + low-pressure rinse. Furniture moved & replaced.",
    included: ["Wood-safe soft-wash", "Low-pressure rinse", "Furniture pull/replace"],
  },
  {
    category: "home",
    tier_name: "Full Exterior",
    base_price_cents: 24900,
    standard_price_cents: 29900,
    duration_minutes: 240,
    description: "House siding + drive + walks. Soft-wash certified, biodegradable cleaners.",
    included: ["Siding soft-wash", "Driveway + walkways", "Eaves + trim", "Window pre-rinse"],
  },
  {
    category: "home",
    tier_name: "Solar Panel Wash",
    base_price_cents: 9900,
    standard_price_cents: 12900,
    duration_minutes: 60,
    description: "Deionised water + soft-touch finish. No chemicals near the panels — ever.",
    included: ["Deionised water rinse", "Soft cloth / brush", "Panel inspection"],
  },
];

export const BIG_RIG_TIERS: Service[] = [
  {
    category: "big_rig",
    tier_name: "Rig Rinse",
    base_price_cents: 11500,
    standard_price_cents: 13500,
    duration_minutes: 90,
    description: "Hand-wash for cab + trailer. Foam, rinse, wheels, mud flaps.",
    included: ["Foam pre-soak", "Cab + trailer rinse", "Wheels & mud flaps", "Glass"],
  },
  {
    category: "big_rig",
    tier_name: "Trailer Wash",
    base_price_cents: 21500,
    standard_price_cents: 24500,
    duration_minutes: 180,
    description: "Full exterior + chrome polish, tire dressing, fender details.",
    included: ["Everything in Rinse", "Chrome polish", "Tire dressing", "Fender detail"],
  },
  {
    category: "big_rig",
    tier_name: "Full Rig Detail",
    base_price_cents: 39900,
    standard_price_cents: 49900,
    duration_minutes: 300,
    description: "Exterior plus cab interior. Vacuum, leather, glass, sleeper too.",
    included: [
      "Everything in Trailer Wash",
      "Cab interior detail",
      "Leather conditioning",
      "Sleeper vacuum",
    ],
  },
  {
    category: "big_rig",
    tier_name: "Showroom Rig",
    base_price_cents: 64900,
    standard_price_cents: 79900,
    duration_minutes: 480,
    description: "Paint correction on cab + trailer, ceramic top-up. Concours-grade.",
    included: ["Everything in Full Rig", "Paint correction", "Ceramic top-up", "8-hour build"],
  },
];

export function fmtUSD(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

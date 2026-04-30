export type ServiceCategory = "auto" | "home" | "commercial" | "big_rig";

export type Service = {
  id?: string;
  category: ServiceCategory;
  tier_name: string;
  base_price_cents: number;
  duration_minutes: number;
  description: string;
  included: string[];
};

export const AUTO_TIERS: Service[] = [
  {
    category: "auto",
    tier_name: "Express Wash",
    base_price_cents: 3500,
    duration_minutes: 30,
    description: "Hand wash, tire shine, windows, door jambs.",
    included: ["Hand wash", "Tire shine", "Windows", "Door jambs"],
  },
  {
    category: "auto",
    tier_name: "Full Detail",
    base_price_cents: 8500,
    duration_minutes: 75,
    description: "Express + interior vacuum, dash wipe, mats.",
    included: ["Hand wash", "Tire shine", "Windows", "Interior vacuum", "Dash wipe", "Floor mats"],
  },
  {
    category: "auto",
    tier_name: "Premium Detail",
    base_price_cents: 18500,
    duration_minutes: 150,
    description: "Full + clay bar, hand wax, leather conditioning.",
    included: ["Everything in Full", "Clay bar treatment", "Hand wax", "Leather conditioning", "Two-bucket method"],
  },
  {
    category: "auto",
    tier_name: "Showroom",
    base_price_cents: 45000,
    duration_minutes: 300,
    description: "Premium + paint correction, ceramic top-up.",
    included: ["Everything in Premium", "Paint correction", "Ceramic top-up", "5–7 hours"],
  },
];

export const HOME_TIERS: Service[] = [
  {
    category: "home",
    tier_name: "Driveway & Walkway",
    base_price_cents: 18500,
    duration_minutes: 90,
    description: "Up to 800 sq ft. Pressure-wash + concrete-safe rinse.",
    included: ["Driveway", "Walkway", "Concrete-safe rinse", "Surface streak removal"],
  },
  {
    category: "home",
    tier_name: "Deck or Patio",
    base_price_cents: 9500,
    duration_minutes: 60,
    description: "Wood-safe pH soft-wash + low-pressure rinse.",
    included: ["Wood-safe soft-wash", "Low-pressure rinse", "Furniture pull/replace"],
  },
  {
    category: "home",
    tier_name: "Full Exterior",
    base_price_cents: 38500,
    duration_minutes: 240,
    description: "House siding + drive + walks. Soft-wash certified.",
    included: ["Siding soft-wash", "Driveway", "Walkways", "Window pre-rinse"],
  },
  {
    category: "home",
    tier_name: "Solar Panel Wash",
    base_price_cents: 1200,
    duration_minutes: 5,
    description: "Per panel. De-ionised water + soft cloth, no chemicals.",
    included: ["De-ionised water", "Soft cloth", "Panel inspection"],
  },
];

export const BIG_RIG_TIERS: Service[] = [
  {
    category: "big_rig",
    tier_name: "Rig Rinse",
    base_price_cents: 14500,
    duration_minutes: 90,
    description: "Hand wash for the cab + trailer/box. Foam, rinse, wheels, mud flaps.",
    included: ["Foam wash", "Cab + trailer rinse", "Wheels & flaps", "Windows"],
  },
  {
    category: "big_rig",
    tier_name: "Trailer Wash",
    base_price_cents: 28500,
    duration_minutes: 180,
    description: "Full exterior with chrome polish, tire dressing, fender details.",
    included: ["Everything in Rinse", "Chrome polish", "Tire dressing", "Fender detail"],
  },
  {
    category: "big_rig",
    tier_name: "Full Rig Detail",
    base_price_cents: 58500,
    duration_minutes: 300,
    description: "Exterior + cab interior. Vacuum, wipe-down, leather conditioning, glass.",
    included: ["Everything in Trailer Wash", "Cab interior detail", "Leather conditioning", "Sleeper vacuum"],
  },
  {
    category: "big_rig",
    tier_name: "Showroom Rig",
    base_price_cents: 95000,
    duration_minutes: 480,
    description: "Premium with paint correction on cab + trailer, ceramic top-up.",
    included: ["Everything in Full Rig", "Paint correction", "Ceramic top-up", "8 hours"],
  },
];

export function fmtUSD(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

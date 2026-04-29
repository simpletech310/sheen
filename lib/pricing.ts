export type Service = {
  id?: string;
  category: "auto" | "home" | "commercial";
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

export function fmtUSD(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

// Per-market metadata for /cities/<slug>. Drives the page copy, the
// JSON-LD LocalBusiness payload Google reads for local SEO, and the
// per-market OG image. Keep this list short and high-signal — every
// city page should be ranked-able.

export type CityMarket = {
  name: string;
  region: string;
  state: "CA";
  slug: string;
  // Hero image used at the top of the page + as the OG/Twitter card.
  // Pulled from /public/img/.
  hero: string;
  // Short blurb for the meta description + listing card.
  shortCopy: string;
  // 1-2 sentence elevator pitch that runs under the H1.
  pitch: string;
  // ZIP codes we serve in this market — surfaced as a chip strip and
  // also baked into the JSON-LD areaServed for local SEO.
  zips: string[];
  neighborhoods: string[];
  // Real lat/lng for JSON-LD geo + map embeds (centroid of the market).
  geo: { lat: number; lng: number };
  // Service highlights — what locals are most likely to book here.
  popular: Array<{ name: string; from: string; href: string }>;
  // Region-specific FAQ entries — render as JSON-LD FAQPage too.
  faq: Array<{ q: string; a: string }>;
};

const HERO_AUTO = "/img/auto.jpg";
const HERO_HOME = "/img/home.jpg";
const HERO_BIGRIG = "/img/big-rig-hero.jpg";
const HERO_DEFAULT = "/img/og-default.jpg";

export const CITIES: Record<string, CityMarket> = {
  // South Bay LA — beach cities + Torrance/Hermosa/Manhattan/Redondo.
  "south-bay": {
    name: "South Bay",
    region: "South Bay LA",
    state: "CA",
    slug: "south-bay",
    hero: HERO_AUTO,
    shortCopy:
      "Mobile car wash & detail across the South Bay — Manhattan Beach to Long Beach. Same-day windows, on-brand finish.",
    pitch:
      "From PCH to PV. Vetted local pros, ceramic-safe products, and a $2,500 damage guarantee on every wash.",
    zips: ["90245", "90254", "90266", "90274", "90275", "90277", "90278", "90501", "90503", "90505", "90745", "90802", "90803", "90814"],
    neighborhoods: [
      "Manhattan Beach",
      "Hermosa Beach",
      "Redondo Beach",
      "El Segundo",
      "Torrance",
      "Palos Verdes",
      "San Pedro",
      "Long Beach",
      "Carson",
    ],
    geo: { lat: 33.8836, lng: -118.4099 },
    popular: [
      { name: "Express Wash", from: "$24", href: "/app/book/auto?tier=Express+Wash" },
      { name: "Full Detail", from: "$49", href: "/app/book/auto?tier=Full+Detail" },
      { name: "Premium Detail", from: "$89", href: "/app/book/auto?tier=Premium+Detail" },
      { name: "Showroom", from: "$159", href: "/app/book/auto?tier=Showroom" },
    ],
    faq: [
      {
        q: "Do Sheen pros come to the beach cities?",
        a: "Yes — most South Bay ZIPs (Manhattan, Hermosa, Redondo, Torrance, El Segundo, PV) have multiple pros who can be on-site within 60 minutes during a Rush window.",
      },
      {
        q: "Can you wash a car parked on the street?",
        a: "Yes. South Bay HOAs and street-parking apartments are routine — your pro brings a self-contained rig with their own water and power.",
      },
      {
        q: "What about salt-air and ceramic coatings?",
        a: "All Sheen pros use pH-balanced, ceramic-safe shampoo. Salt residue from beach driving is exactly what the Express + tire-shine combo is built for.",
      },
    ],
  },

  // Riverside — the city itself.
  riverside: {
    name: "Riverside",
    region: "Inland Empire",
    state: "CA",
    slug: "riverside",
    hero: HERO_HOME,
    shortCopy:
      "On-demand car wash, detail, and pressure-wash in Riverside. Vetted pros, $2,500 damage cover, transparent pricing.",
    pitch:
      "Riverside's heat and dust are tough on paint. Sheen pros bring decontamination, ceramic-safe wax, and same-day availability across the city.",
    zips: ["92501", "92503", "92504", "92505", "92506", "92507", "92508", "92509"],
    neighborhoods: [
      "Downtown Riverside",
      "Canyon Crest",
      "Wood Streets",
      "La Sierra",
      "Arlington",
      "Orangecrest",
      "Mission Grove",
      "Casa Blanca",
    ],
    geo: { lat: 33.9533, lng: -117.3962 },
    popular: [
      { name: "Express Wash", from: "$24", href: "/app/book/auto?tier=Express+Wash" },
      { name: "Full Detail", from: "$49", href: "/app/book/auto?tier=Full+Detail" },
      { name: "Driveway & Walkway", from: "$129", href: "/app/book?category=home&tier=Driveway+%26+Walkway" },
      { name: "Solar Panel Wash", from: "$99", href: "/app/book?category=home&tier=Solar+Panel+Wash" },
    ],
    faq: [
      {
        q: "Will my paint survive a Riverside summer?",
        a: "Hot paint + cold water is what kills clear coat. Our pros foam-soak, work in shade or low sun, and finish with a hand-applied wax — not a runaway pressure rinse.",
      },
      {
        q: "Do you serve the Canyon Crest / Orangecrest hills?",
        a: "Yes — every Riverside ZIP from 92501 to 92509 is in-network. Expect a 30-90 minute window depending on the day.",
      },
      {
        q: "Solar-panel wash with hard water?",
        a: "We rinse with deionised water — no spotting, no etch on the panel surface. Recovers real watts in dusty seasons.",
      },
    ],
  },

  // Inland Empire umbrella — covers IE markets that don't have their own page.
  "inland-empire": {
    name: "Inland Empire",
    region: "Inland Empire",
    state: "CA",
    slug: "inland-empire",
    hero: HERO_BIGRIG,
    shortCopy:
      "Mobile car wash, detail, home power-wash, and big-rig service across the Inland Empire — San Bernardino to Corona to Ontario.",
    pitch:
      "From the 91 to the 215. Auto, home, and big-rig pros across San Bernardino, Riverside, Ontario, Rancho Cucamonga, Fontana, Corona — same-day windows, no surge.",
    zips: ["91710", "91739", "91761", "91762", "91764", "92335", "92336", "92337", "92376", "92377", "92408", "92410", "92879", "92880", "92881"],
    neighborhoods: [
      "San Bernardino",
      "Ontario",
      "Rancho Cucamonga",
      "Fontana",
      "Chino",
      "Chino Hills",
      "Corona",
      "Norco",
      "Eastvale",
      "Jurupa Valley",
      "Moreno Valley",
      "Redlands",
    ],
    geo: { lat: 34.0633, lng: -117.6509 },
    popular: [
      { name: "Express Wash", from: "$24", href: "/app/book/auto?tier=Express+Wash" },
      { name: "Premium Detail", from: "$89", href: "/app/book/auto?tier=Premium+Detail" },
      { name: "Big Rig Rinse", from: "$115", href: "/app/book?category=big_rig&tier=Rig+Rinse" },
      { name: "Full Exterior", from: "$249", href: "/app/book?category=home&tier=Full+Exterior" },
    ],
    faq: [
      {
        q: "Do you wash semi trucks at truck stops?",
        a: "Yes. Big-rig service across IE — Ontario, Fontana, Eastvale yards, and the 10/15 truck stops. Same-day Rig Rinse to multi-day Showroom Rig.",
      },
      {
        q: "Hard water spots — what do you do?",
        a: "Two-bucket method, microfiber per panel, and a final hand-dry. No air-blower lazy finishes, no rinse-and-roll.",
      },
      {
        q: "Inland Empire siding wash?",
        a: "Soft-wash certified, biodegradable cleaners, low-pressure rinse — never blasted. Includes driveway + walkways in Full Exterior.",
      },
    ],
  },

  // Long Beach — high-volume South Bay sub-market that warrants its own page.
  "long-beach": {
    name: "Long Beach",
    region: "South Bay LA",
    state: "CA",
    slug: "long-beach",
    hero: HERO_AUTO,
    shortCopy:
      "Mobile car wash & detail in Long Beach — Belmont Shore, Bixby Knolls, Naples, Downtown. Same-day windows.",
    pitch:
      "From Belmont Shore to Bixby Knolls. Vetted Long Beach pros, ceramic-safe products, and a $2,500 damage guarantee.",
    zips: ["90802", "90803", "90804", "90805", "90806", "90807", "90808", "90810", "90813", "90814", "90815"],
    neighborhoods: [
      "Belmont Shore",
      "Naples",
      "Bixby Knolls",
      "Downtown Long Beach",
      "Alamitos Beach",
      "Cal Heights",
      "El Dorado Park",
      "Bluff Heights",
    ],
    geo: { lat: 33.7701, lng: -118.1937 },
    popular: [
      { name: "Express Wash", from: "$24", href: "/app/book/auto?tier=Express+Wash" },
      { name: "Full Detail", from: "$49", href: "/app/book/auto?tier=Full+Detail" },
      { name: "Premium Detail", from: "$89", href: "/app/book/auto?tier=Premium+Detail" },
      { name: "Driveway Wash", from: "$129", href: "/app/book?category=home&tier=Driveway+%26+Walkway" },
    ],
    faq: [
      {
        q: "Do Sheen pros come to apartments off Ocean Blvd?",
        a: "Yes — your pro carries water + power. Street-parking apartments and condo complexes are routine across LBC.",
      },
      {
        q: "What about HOA driveways in Naples / Belmont?",
        a: "Eco-friendly cleaners, no run-off issues, storm-drain-compliant. Most HOAs are fine with mobile detail.",
      },
    ],
  },

  // Compton — keep the existing entry but level it up.
  compton: {
    name: "Compton",
    region: "Greater LA",
    state: "CA",
    slug: "compton",
    hero: HERO_AUTO,
    shortCopy:
      "Mobile car wash & detail in Compton — Express to showroom-grade. Vetted local pros, $2,500 damage cover.",
    pitch:
      "Compton-based pros who know the streets. Same-day windows, transparent pricing, and a finish that holds up.",
    zips: ["90220", "90221", "90222"],
    neighborhoods: [
      "Downtown Compton",
      "Sunny Cove",
      "Leland",
      "Walnut Drive",
      "Richland Farms",
    ],
    geo: { lat: 33.8958, lng: -118.2201 },
    popular: [
      { name: "Express Wash", from: "$24", href: "/app/book/auto?tier=Express+Wash" },
      { name: "Full Detail", from: "$49", href: "/app/book/auto?tier=Full+Detail" },
      { name: "Premium Detail", from: "$89", href: "/app/book/auto?tier=Premium+Detail" },
      { name: "Showroom", from: "$159", href: "/app/book/auto?tier=Showroom" },
    ],
    faq: [
      {
        q: "Same-day in Compton?",
        a: "Most Compton ZIPs have a Rush-eligible pro within an hour during business days.",
      },
    ],
  },

  // Los Angeles umbrella — fallback for the rest of LA proper.
  "los-angeles": {
    name: "Los Angeles",
    region: "Greater LA",
    state: "CA",
    slug: "los-angeles",
    hero: HERO_DEFAULT,
    shortCopy:
      "On-demand car wash and detail across Los Angeles. Express to Showroom, Auto to Big Rig.",
    pitch:
      "Vetted LA pros, $1M GL insurance, $2,500 damage cover, transparent flat-rate pricing.",
    zips: ["90001", "90011", "90017", "90024", "90036", "90048", "90064", "90069", "90077", "90210", "90291"],
    neighborhoods: [
      "Downtown",
      "Hollywood",
      "Beverly Hills",
      "West Hollywood",
      "Westside",
      "Mid-City",
      "Venice",
      "Silver Lake",
      "Echo Park",
    ],
    geo: { lat: 34.0522, lng: -118.2437 },
    popular: [
      { name: "Express Wash", from: "$24", href: "/app/book/auto?tier=Express+Wash" },
      { name: "Full Detail", from: "$49", href: "/app/book/auto?tier=Full+Detail" },
      { name: "Premium Detail", from: "$89", href: "/app/book/auto?tier=Premium+Detail" },
      { name: "Showroom", from: "$159", href: "/app/book/auto?tier=Showroom" },
    ],
    faq: [
      {
        q: "Coverage across LA?",
        a: "Westside, DTLA, Hollywood, Mid-City, and Venice all have multiple pros within radius. Same-day availability most weekdays.",
      },
    ],
  },
};

export const CITY_SLUGS = Object.keys(CITIES);

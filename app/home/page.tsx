import Link from "next/link";
import { MNav } from "@/components/marketing/MNav";
import { MFooter } from "@/components/marketing/MFooter";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { Placeholder } from "@/components/marketing/Placeholder";

export const metadata = {
  title: "Home power-wash — Sheen",
  description:
    "Driveways, siding, decks, solar panels. Soft-wash certified pros, deck-safe pH, transparent pricing.",
};

const tiers = [
  {
    tag: "01",
    name: "Driveway & Walkway",
    desc: "Up to 800 sq ft of concrete or pavers. Oil spot pre-treatment included.",
    price: "$185",
    time: "90 min",
  },
  {
    tag: "02",
    name: "Full Exterior",
    desc: "House siding + driveway + walkways. Soft-wash on siding, pressure on hardscape.",
    price: "$385",
    time: "4 hr",
    featured: true,
  },
  {
    tag: "03",
    name: "Deck / Patio Add-on",
    desc: "Deck or patio cleaning with deck-safe pH. Pairs with any tier above.",
    price: "$95",
    time: "60 min",
  },
  {
    tag: "04",
    name: "Solar Panel Wash",
    desc: "Per panel, deionized water. Recovers 5–15% output on dusty arrays.",
    price: "$12",
    time: "5 min/panel",
  },
];

const why = [
  {
    h: "Soft-wash certified",
    d: "Siding gets a low-pressure soft-wash with biodegradable cleaner — never blasted. No paint damage, no water intrusion.",
  },
  {
    h: "Deck-safe pH",
    d: "We pH-balance for wood, composite, and stone. Your deck doesn't get bleached out.",
  },
  {
    h: "Eco-runoff",
    d: "Cleaners break down within 24 hours. Storm-drain compliant in every LA county.",
  },
  {
    h: "Move the needle on solar",
    d: "Dust + bird droppings cost real watts. Our deionized rinse leaves zero residue.",
  },
];

export default function HomePage() {
  return (
    <>
      <MNav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-royal text-bone">
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/home.jpg" alt="" className="w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-r from-royal/95 via-royal/70 to-royal/30" />
        </div>
        <div className="relative z-10 px-6 md:px-14 pt-16 md:pt-20 pb-14">
          <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
          <Eyebrow className="!text-sol">Service · Home</Eyebrow>
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-8 mt-7">
            <h1 className="display text-[64px] md:text-[112px] leading-[0.92] max-w-[800px]">
              DRIVEWAYS,
              <br />
              SIDING,
              <br />
              SOLAR.
              <br />
              <span className="text-sol">CLEANED RIGHT.</span>
            </h1>
            <p className="max-w-[420px] text-base md:text-lg leading-relaxed text-bone/80">
              Soft-wash certified pros for siding. Pressure-washed concrete.
              Deck-safe pH. Solar panel cleanings that move output. Transparent
              pricing, no deposit.
            </p>
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/app/book?category=home"
              className="bg-sol text-ink px-7 py-4 text-sm font-bold uppercase tracking-wide hover:bg-bone transition"
            >
              Book a wash →
            </Link>
            <Link
              href="#tiers"
              className="border border-bone text-bone px-7 py-4 text-sm font-bold uppercase tracking-wide hover:bg-bone hover:text-ink transition"
            >
              See tiers
            </Link>
          </div>
        </div>
      </section>

      {/* Why band */}
      <section className="px-6 md:px-14 py-16">
        <div className="flex justify-between items-end mb-10">
          <h2 className="display text-[36px] md:text-[56px] leading-none">WHY US.</h2>
          <Eyebrow>The standard</Eyebrow>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {why.map((w, i) => (
            <div key={w.h} className="border-l-2 border-royal bg-mist/40 p-5">
              <div className="font-mono text-[10px] uppercase tracking-wider text-royal">
                {String(i + 1).padStart(2, "0")} · {w.h}
              </div>
              <p className="text-sm text-ink/80 mt-3 leading-relaxed">{w.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tier matrix — same shape as /auto and /big-rig */}
      <section id="tiers" className="px-6 md:px-14 py-16 bg-mist/30">
        <div className="flex justify-between items-end mb-10">
          <h2 className="display text-[36px] md:text-[56px] leading-none">FOUR OPTIONS.</h2>
          <Eyebrow>Pick yours</Eyebrow>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border border-mist">
          {tiers.map((tier, i) => (
            <div
              key={tier.tag}
              className={`p-7 min-h-[400px] flex flex-col justify-between ${
                i < tiers.length - 1
                  ? "lg:border-r border-b lg:border-b-0 border-mist"
                  : ""
              } ${tier.featured ? "bg-royal text-bone relative" : "bg-bone text-ink"}`}
            >
              {tier.featured && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
              )}
              <div>
                <div className="flex justify-between mb-6">
                  <span className="font-mono text-[11px] opacity-60">
                    {tier.tag} / 04
                  </span>
                  {tier.featured && (
                    <span className="font-mono text-[10px] text-sol px-2 py-1 border border-sol uppercase">
                      Most-booked
                    </span>
                  )}
                </div>
                <div className="display text-[26px] leading-tight mb-1">
                  {tier.name.toUpperCase()}
                </div>
                <div className="font-mono text-xs tabular opacity-60">
                  {tier.time.toUpperCase()}
                </div>
                <p
                  className={`text-sm mt-4 leading-relaxed ${
                    tier.featured ? "text-bone/85" : "text-smoke"
                  }`}
                >
                  {tier.desc}
                </p>
              </div>
              <div className="mt-6">
                <div
                  className={`display tabular text-[40px] leading-none mb-4 ${
                    tier.featured ? "text-sol" : "text-royal"
                  }`}
                >
                  {tier.price}
                </div>
                <Link
                  href={`/app/book?category=home&tier=${encodeURIComponent(tier.name)}`}
                  className={`block w-full text-center py-3.5 text-sm font-bold uppercase tracking-wide transition ${
                    tier.featured
                      ? "bg-sol text-ink hover:bg-bone"
                      : "bg-ink text-bone hover:bg-royal"
                  }`}
                >
                  Book →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Before/after gallery */}
      <section className="px-6 md:px-14 py-16 bg-ink text-bone">
        <div className="flex justify-between items-end mb-8">
          <h2 className="display text-[36px] md:text-[56px] leading-none">BEFORE / AFTER.</h2>
          <Eyebrow className="!text-sol" prefix={null}>The difference</Eyebrow>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Placeholder label="driveway · before" tone="ink" height={220} src="/img/driveway_before.jpg" />
          <Placeholder label="driveway · after" tone="royal" height={220} src="/img/driveway_after.jpg" />
          <Placeholder label="siding · before" tone="ink" height={220} src="/img/siding_before.jpg" />
          <Placeholder label="siding · after" tone="sol" height={220} src="/img/siding_after.jpg" />
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-royal text-bone px-6 md:px-14 py-20 text-center relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
        <h2 className="display text-[44px] md:text-[72px] leading-tight">
          BOOK YOUR <span className="text-sol">PROPERTY.</span>
        </h2>
        <p className="mt-4 max-w-md mx-auto opacity-80 text-sm">
          Same-week windows in LA. Eco-friendly. $1M GL on every pro.
        </p>
        <Link
          href="/app/book?category=home"
          className="mt-8 inline-block bg-sol text-ink px-9 py-5 text-base font-bold uppercase tracking-wide hover:bg-bone transition"
        >
          Book a wash →
        </Link>
      </section>

      <MFooter />
    </>
  );
}

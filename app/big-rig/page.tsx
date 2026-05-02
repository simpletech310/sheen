import Link from "next/link";
import { MNav } from "@/components/marketing/MNav";
import { MFooter } from "@/components/marketing/MFooter";
import { Eyebrow } from "@/components/brand/Eyebrow";

export const metadata = {
  title: "Mobile big-rig & semi truck wash — LA + Inland Empire",
  description:
    "Mobile big-rig wash, polish, and paint correction — at the rest stop, the yard, or the customer's lot. Equipment-verified pros only. 24/7 in LA + Inland Empire. Pay only after you approve the finished work.",
  alternates: { canonical: "/big-rig" },
  openGraph: {
    title: "Mobile big-rig & semi truck wash — LA + Inland Empire",
    description:
      "Foam, polish, paint correction — at the yard or rest stop. Pay only after you approve.",
    images: [{ url: "/img/big-rig-hero.jpg", width: 1200, height: 630, alt: "Sheen big-rig mobile wash" }],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Mobile big-rig & semi truck wash — Sheen",
    description: "Foam, polish, paint correction. Pay after you approve.",
    images: ["/img/big-rig-hero.jpg"],
  },
};

const tiers = [
  {
    tag: "01",
    name: "Rig Rinse",
    price: "$115",
    was: "$135",
    time: "1.5 hr",
    items: ["Foam wash", "Cab + trailer rinse", "Wheels & flaps", "Windows"],
  },
  {
    tag: "02",
    name: "Trailer Wash",
    price: "$215",
    was: "$245",
    time: "3 hr",
    items: [
      "Everything in Rinse",
      "Chrome polish",
      "Tire dressing",
      "Fender detail",
    ],
  },
  {
    tag: "03",
    name: "Full Rig Detail",
    price: "$399",
    was: "$499",
    time: "5 hr",
    items: [
      "Everything in Trailer",
      "Cab interior detail",
      "Leather conditioning",
      "Sleeper vacuum",
    ],
    featured: true,
  },
  {
    tag: "04",
    name: "Showroom Rig",
    price: "$649",
    was: "$799",
    time: "8 hr",
    items: [
      "Everything in Full Rig",
      "Paint correction",
      "Ceramic top-up",
      "Concours-grade",
    ],
  },
];

const memberships = [
  {
    name: "Rig Solo",
    price: "$199/mo",
    desc: "1 Trailer Wash per month — built for owner-operators.",
    fits: ["1 wash / mo", "Up to Trailer Wash tier", "Same-day priority"],
  },
  {
    name: "Rig Pro",
    price: "$349/mo",
    desc: "2 big-rig washes up to Full Rig Detail. For grinders.",
    fits: ["2 washes / mo", "Up to Full Rig Detail", "Priority queue"],
    featured: true,
  },
  {
    name: "Sheen+ Combined",
    price: "$199/mo",
    desc: "1 auto Premium Detail + 1 Trailer Wash. For two-vehicle pros.",
    fits: ["Auto + rig coverage", "Up to Premium auto / Trailer rig", "Same priority"],
  },
];

const why: { h: string; d: string }[] = [
  {
    h: "We come to you",
    d: "Rest stop, yard, drop lot, your driveway — wherever you've parked. No detour, no detailing-shop appointment.",
  },
  {
    h: "Full-size kit",
    d: "Pros confirmed for big-rig before booking: long hoses, foam cannon, ladders, high-flow pumps. No half-built rigs trying to do a 53-footer.",
  },
  {
    h: "Insured for the load",
    d: "$1M GL on every pro. $2,500 damage guarantee on every wash. File from the app within 24 hours.",
  },
  {
    h: "DOT-friendly turnaround",
    d: "Quick rinse before a CSA-anything inspection. Or full showroom-grade for a tradeshow / sale.",
  },
];

const faq: [string, string][] = [
  [
    "Can you wash at a truck stop?",
    "Yes. Drop the pin, your pro confirms space + access, and they show up with their own water and power.",
  ],
  [
    "What if the trailer's loaded?",
    "Exterior wash works either way. For Full Rig Detail interiors we do the cab while the box stays sealed.",
  ],
  [
    "Reefer / tanker / flatbed — all good?",
    "All of them. Pros mark the rig types they handle when they opt in to the big-rig queue. We only route what they're set up for.",
  ],
  [
    "How long does Showroom Rig take?",
    "Plan a full 8 hours. Paint correction on a 70-foot rig isn't a quick job. We don't cheat the time.",
  ],
];

export default function BigRigPage() {
  return (
    <>
      <MNav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-ink text-bone">
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/big-rig-hero.jpg" alt="" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-royal/95 via-ink/85 to-ink/40" />
        </div>
        <div className="relative z-10 px-6 md:px-14 pt-16 md:pt-20 pb-14">
          <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
          <Eyebrow className="!text-sol">Service · Big Rig</Eyebrow>
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-8 mt-7">
            <h1 className="display text-[56px] md:text-[104px] leading-[0.92] max-w-[800px]">
              TRACTORS,
              <br />
              TRAILERS,
              <br />
              SLEEPERS.
              <br />
              <span className="text-sol">SHEENED.</span>
            </h1>
            <p className="max-w-[420px] text-base md:text-lg leading-relaxed text-bone/80">
              On-site big-rig wash &amp; detail. Foam pre-soak, chrome polish,
              paint correction. At the rest stop, the yard, or wherever your
              rig sleeps tonight.
            </p>
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/app/book?category=big_rig"
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
          <Eyebrow>What you get</Eyebrow>
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

      {/* Tiers */}
      <section id="tiers" className="px-6 md:px-14 py-16 bg-mist/30">
        <div className="flex justify-between items-end mb-10">
          <h2 className="display text-[36px] md:text-[56px] leading-none">FOUR TIERS.</h2>
          <Eyebrow>Pick your level</Eyebrow>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border border-mist">
          {tiers.map((tier, i) => (
            <div
              key={tier.tag}
              className={`p-7 min-h-[480px] flex flex-col justify-between ${
                i < tiers.length - 1
                  ? "lg:border-r border-b lg:border-b-0 border-mist"
                  : ""
              } ${tier.featured ? "bg-royal text-bone relative" : "bg-bone text-ink"}`}
            >
              {tier.featured && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
              )}
              <div>
                <div className="flex justify-between mb-8">
                  <span className="font-mono text-[11px] opacity-60">
                    {tier.tag} / 04
                  </span>
                  {tier.featured && (
                    <span className="font-mono text-[10px] text-sol px-2 py-1 border border-sol uppercase">
                      Most-booked
                    </span>
                  )}
                </div>
                <div className="display text-[28px] leading-tight mb-1">
                  {tier.name.toUpperCase()}
                </div>
                <div className="font-mono text-xs tabular opacity-60">
                  {tier.time.toUpperCase()}
                </div>
              </div>
              <div className="my-8 flex-1">
                {tier.items.map((it) => (
                  <div
                    key={it}
                    className={`text-sm py-2.5 border-t opacity-90 ${
                      tier.featured ? "border-bone/20" : "border-mist"
                    }`}
                  >
                    {it}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span
                    className={`display tabular text-[44px] leading-none ${
                      tier.featured ? "text-sol" : "text-ink"
                    }`}
                  >
                    {tier.price}
                  </span>
                  {(tier as any).was && (
                    <span className={`font-mono text-sm tabular line-through ${tier.featured ? "text-bone/50" : "text-smoke"}`}>
                      {(tier as any).was}
                    </span>
                  )}
                </div>
                <div className={`font-mono text-[10px] uppercase tracking-wider mb-4 ${tier.featured ? "text-sol/80" : "text-royal"}`}>
                  Launch promo · 90 days
                </div>
                <Link
                  href={`/app/book?category=big_rig&tier=${encodeURIComponent(tier.name)}`}
                  className={`block w-full text-center py-3.5 text-sm font-bold uppercase tracking-wide transition ${
                    tier.featured
                      ? "bg-sol text-ink hover:bg-bone"
                      : "bg-ink text-bone hover:bg-royal"
                  }`}
                >
                  Book {tier.name} →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Memberships — Rig Solo, Rig Pro, Combined */}
      <section className="px-6 md:px-14 py-20">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-10">
          <div>
            <Eyebrow className="!text-royal" prefix={null}>
              SHEEN+ for rigs
            </Eyebrow>
            <h2 className="display text-[36px] md:text-[56px] leading-tight mt-3">
              MEMBERSHIPS THAT
              <br />
              <span className="text-royal">PAY THEMSELVES.</span>
            </h2>
            <p className="text-sm text-smoke mt-3 max-w-md leading-relaxed">
              Built for owner-operators and small fleets. Guaranteed washes
              every month, priority routing, 100% loyalty-point earn rate.
            </p>
          </div>
          <Link
            href="/app/membership"
            className="bg-ink text-bone px-6 py-4 text-sm font-bold uppercase tracking-wide hover:bg-royal transition self-start md:self-end"
          >
            Subscribe →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {memberships.map((m) => (
            <div
              key={m.name}
              className={`relative p-6 border ${
                m.featured
                  ? "bg-royal text-bone border-royal"
                  : "bg-bone text-ink border-mist"
              }`}
            >
              {m.featured && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
              )}
              <div className="flex justify-between items-start mb-4">
                <div className="display text-[28px] leading-tight">
                  {m.name.toUpperCase()}
                </div>
                {m.featured && (
                  <span className="font-mono text-[10px] text-sol px-2 py-1 border border-sol uppercase">
                    Popular
                  </span>
                )}
              </div>
              <div
                className={`display tabular text-4xl ${
                  m.featured ? "text-sol" : "text-royal"
                }`}
              >
                {m.price}
              </div>
              <p
                className={`text-sm mt-3 leading-relaxed ${
                  m.featured ? "text-bone/85" : "text-smoke"
                }`}
              >
                {m.desc}
              </p>
              <div className="mt-5 space-y-2">
                {m.fits.map((f) => (
                  <div
                    key={f}
                    className={`text-xs py-1.5 border-t ${
                      m.featured ? "border-bone/20" : "border-mist"
                    }`}
                  >
                    {f}
                  </div>
                ))}
              </div>
              <Link
                href="/app/membership"
                className={`mt-6 block text-center py-3 text-xs font-bold uppercase tracking-wide transition ${
                  m.featured
                    ? "bg-sol text-ink hover:bg-bone"
                    : "bg-ink text-bone hover:bg-royal"
                }`}
              >
                Choose {m.name} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 md:px-14 py-20 bg-ink text-bone">
        <div className="flex justify-between items-end mb-10">
          <h2 className="display text-[36px] md:text-[56px] leading-none">QUESTIONS.</h2>
          <Eyebrow className="!text-sol" prefix={null}>FAQ</Eyebrow>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {faq.map(([q, a], i) => (
            <details
              key={q}
              className="bg-white/5 p-5 border-l-2 border-sol group"
            >
              <summary className="display text-xl cursor-pointer flex justify-between items-center text-bone">
                <span>{q}</span>
                <span className="text-sol ml-3 group-open:rotate-45 transition">+</span>
              </summary>
              <p className="text-sm text-bone/75 mt-3 leading-relaxed">{a}</p>
              <div className="font-mono text-[10px] text-bone/40 uppercase mt-3 tabular">
                {String(i + 1).padStart(2, "0")} / {String(faq.length).padStart(2, "0")}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-royal text-bone px-6 md:px-14 py-20 text-center relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
        <h2 className="display text-[44px] md:text-[72px] leading-tight">
          BOOK YOUR <span className="text-sol">RIG.</span>
        </h2>
        <p className="mt-4 max-w-md mx-auto opacity-80 text-sm">
          Same-day windows in LA. Insured pros. 100% of tips to your driver.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/app/book?category=big_rig"
            className="bg-sol text-ink px-9 py-5 text-base font-bold uppercase tracking-wide hover:bg-bone transition"
          >
            Book a wash →
          </Link>
          <Link
            href="/app/membership"
            className="border border-bone text-bone px-9 py-5 text-base font-bold uppercase tracking-wide hover:bg-bone hover:text-ink transition"
          >
            See plans
          </Link>
        </div>
      </section>

      <MFooter />
    </>
  );
}

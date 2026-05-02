import Link from "next/link";
import { MNav } from "@/components/marketing/MNav";
import { MFooter } from "@/components/marketing/MFooter";
import { Eyebrow } from "@/components/brand/Eyebrow";

export const metadata = {
  title: "Commercial wash, fleet & storefront cleaning — Sheen LA",
  description:
    "Storefronts, multi-family, fleets, post-construction. Site visit, custom quote in 24h, net-30 invoicing for verified businesses. $1M GL on every wash, dedicated account routing.",
  alternates: { canonical: "/business" },
  openGraph: {
    title: "Commercial wash & fleet cleaning — Sheen LA",
    description:
      "Storefronts, fleets, multi-family, post-construction. Site visit + custom quote in 24h. Net-30 for verified businesses.",
    images: [
      { url: "/img/commercial.jpg", width: 1200, height: 630, alt: "Sheen commercial wash" },
    ],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Commercial wash & fleet cleaning — Sheen",
    description:
      "Storefronts, fleets, multi-family, post-construction. Quote in 24h.",
    images: ["/img/commercial.jpg"],
  },
};

const verticals = [
  {
    h: "Storefronts & restaurants",
    d: "Sidewalks, entries, awnings, glass. Pre-open windows so your AM customers walk into clean.",
  },
  {
    h: "Multi-family & HOA",
    d: "Garages, breezeways, pool decks, common-area glass. Recurring schedules with discounted rates.",
  },
  {
    h: "Auto fleets & dealerships",
    d: "From 5-vehicle fleets to dealer lots. Big-rig capable pros for long-haul trucks.",
  },
  {
    h: "Post-construction",
    d: "Concrete dust, paint over-spray, glass cleanup. Final-walk-ready turnover for GCs.",
  },
];

const why = [
  { k: "24h", v: "Quote turnaround" },
  { k: "15%", v: "Recurring contract discount" },
  { k: "Net-30", v: "Invoicing for verified biz" },
  { k: "$1M", v: "GL · every site visit" },
];

export default function BusinessPage() {
  return (
    <>
      <MNav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-ink text-bone">
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/commercial.jpg" alt="" className="w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/70 to-ink/30" />
        </div>
        <div className="relative z-10 px-6 md:px-14 pt-16 md:pt-20 pb-14">
          <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
          <Eyebrow className="!text-sol">Service · Commercial</Eyebrow>
          <h1 className="display text-[56px] md:text-[104px] leading-[0.92] max-w-[1000px] mt-7">
            STOREFRONTS. LOTS. FLEET.
            <br />
            <span className="text-sol">QUOTED &amp; VETTED.</span>
          </h1>
          <p className="mt-8 max-w-[520px] text-base md:text-lg leading-relaxed text-bone/80">
            Commercial work is partner-routed. Site visit, custom quote in 24
            hours, net-30 invoicing for verified businesses. Recurring
            contracts get a 15% discount.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="#quote"
              className="bg-sol text-ink px-7 py-4 text-sm font-bold uppercase tracking-wide hover:bg-bone transition"
            >
              Request a quote →
            </Link>
            <Link
              href="/big-rig"
              className="border border-bone text-bone px-7 py-4 text-sm font-bold uppercase tracking-wide hover:bg-bone hover:text-ink transition"
            >
              Big rig &amp; fleet →
            </Link>
          </div>
        </div>
      </section>

      {/* Verticals */}
      <section className="px-6 md:px-14 py-16">
        <div className="flex justify-between items-end mb-10">
          <h2 className="display text-[36px] md:text-[56px] leading-none">WHO WE SERVE.</h2>
          <Eyebrow>Verticals</Eyebrow>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {verticals.map((v, i) => (
            <div key={v.h} className="border-l-2 border-royal bg-mist/40 p-6">
              <div className="font-mono text-[10px] uppercase tracking-wider text-royal mb-2">
                {String(i + 1).padStart(2, "0")} · {v.h}
              </div>
              <p className="text-sm text-ink/80 leading-relaxed">{v.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why us strip */}
      <section className="bg-royal text-bone relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
        <div className="px-6 md:px-14 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-6 items-center">
            {why.map((s, i) => (
              <div
                key={s.k}
                className={i > 0 ? "md:border-l md:border-bone/25 md:pl-6" : ""}
              >
                <div className="display tabular text-3xl md:text-5xl leading-none text-sol">
                  {s.k}
                </div>
                <div className="font-mono text-[11px] uppercase opacity-80 mt-3">
                  {s.v}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote form */}
      <section id="quote" className="px-6 md:px-14 py-20 bg-mist/30">
        <div className="max-w-3xl">
          <Eyebrow>Request a quote</Eyebrow>
          <h2 className="display text-[36px] md:text-[56px] leading-tight mt-3 mb-3">
            TELL US ABOUT THE
            <br />
            <span className="text-royal">SITE.</span>
          </h2>
          <p className="text-sm text-smoke mb-7 max-w-md leading-relaxed">
            One of our partners will reach out in 24 hours with a custom quote.
            No obligation, no deposit.
          </p>
          <form
            action="/api/quote"
            method="post"
            className="bg-bone p-8 grid grid-cols-1 md:grid-cols-2 gap-4 border border-mist"
          >
            <input
              name="business_name"
              required
              placeholder="Business name"
              className="px-4 py-3 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
            />
            <input
              name="email"
              type="email"
              required
              placeholder="Email"
              className="px-4 py-3 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
            />
            <select
              name="property_type"
              className="px-4 py-3 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
            >
              <option>Storefront</option>
              <option>Restaurant</option>
              <option>Office</option>
              <option>Medical</option>
              <option>Multi-family / HOA</option>
              <option>Auto fleet</option>
              <option>Big rig fleet</option>
              <option>Dealership</option>
              <option>Post-construction</option>
            </select>
            <select
              name="frequency"
              className="px-4 py-3 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
            >
              <option>One-time</option>
              <option>Weekly</option>
              <option>Bi-weekly</option>
              <option>Monthly</option>
              <option>Quarterly</option>
            </select>
            <textarea
              name="notes"
              required
              placeholder="Scope (sidewalk + entry, windows, awning, lot, fleet count + types, etc.)"
              rows={4}
              className="md:col-span-2 px-4 py-3 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
            />
            <button
              type="submit"
              className="md:col-span-2 bg-royal text-bone px-6 py-4 text-sm font-bold uppercase tracking-wide hover:bg-ink transition"
            >
              Request site visit →
            </button>
          </form>
        </div>
      </section>

      <MFooter />
    </>
  );
}

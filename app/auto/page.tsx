import Link from "next/link";
import { MNav } from "@/components/marketing/MNav";
import { MFooter } from "@/components/marketing/MFooter";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { Placeholder } from "@/components/marketing/Placeholder";

const why = [
  {
    h: "Two-bucket method, always",
    d: "Wash bucket + rinse bucket on every car. Microfiber per panel — never the same towel on the wheels and the paint.",
  },
  {
    h: "Ceramic-safe products",
    d: "pH-balanced soap, hand-applied wax, leather-safe conditioner. Nothing on your paint we wouldn't put on our own.",
  },
  {
    h: "We bring the rig",
    d: "Self-contained water + power. No hose hookup, no power cord through your window. Zero footprint on your driveway.",
  },
  {
    h: "Damage covered",
    d: "$2,500 guarantee on every wash. File from the app within 24 hours. Paid out from a platform reserve, not the pro's pocket.",
  },
];

const tiers = [
  { tag: "01", name: "Express",       price: "$24",  was: "$29",  time: "30 min", items: ["Foam pre-soak", "Hand wash", "Dressed wheels & tires", "Streak-free glass"] },
  { tag: "02", name: "Full Detail",   price: "$49",  was: "$59",  time: "60 min", items: ["Everything in Express", "Interior vacuum", "Dash + console wipe", "Mats lifted & cleaned"] },
  { tag: "03", name: "Premium",       price: "$89",  was: "$109", time: "90 min", items: ["Everything in Full", "Clay-bar decontamination", "Hand-applied wax", "Leather conditioning"], featured: true },
  { tag: "04", name: "Showroom",      price: "$159", was: "$189", time: "3 hr",   items: ["Everything in Premium", "Paint correction", "Ceramic top-up", "Engine bay detail"] },
];

const gallery: [string, string, string][] = [
  ["GT-R · pressure wash", "Beverly Hills", "/img/washer.jpg"],
  ["Mustang · showroom", "Pasadena", "/img/showroom.jpg"],
  ["Panamera · premium", "Long Beach", "/img/og-default.jpg"],
  ["4Runner · full detail", "Compton", "/img/auto-detail.jpg"],
];

const faq: [string, string][] = [
  ["Do you bring water and power?", "Yes. Every Sheen pro carries a self-contained rig — water tank, power, eco-friendly soaps. No hose hookup needed."],
  ["What if it rains?", "Reschedule free up to one hour before. We monitor radar and reach out first if it looks bad."],
  ["Are my products safe?", "Ceramic-safe wax, pH-balanced shampoo, microfiber per panel. We won't touch your paint with anything we wouldn't use on our own."],
  ["How does the damage guarantee work?", "Every wash is covered up to $2,500. File from the app within 24 hours of completion."],
  ["Do tips go to the pro?", "100%, no platform cut. Default prompts at 18 / 22 / 25%, custom amounts allowed."],
];

export const metadata = {
  title: "Auto detail — Sheen",
  description:
    "On-demand car wash + detail across LA. Express to Showroom. Two-bucket method, ceramic-safe, $2,500 damage cover.",
  openGraph: {
    title: "Auto detail — Sheen",
    description: "Express to Showroom. Two-bucket method, ceramic-safe, vetted local pros.",
    images: [{ url: "/img/auto.jpg", width: 1200, height: 630, alt: "Sheen mobile auto detail" }],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Auto detail — Sheen",
    description: "Express to Showroom. Vetted local pros.",
    images: ["/img/auto.jpg"],
  },
};

export default function AutoPage() {
  return (
    <>
      <MNav />

      {/* Hero with image */}
      <section className="relative overflow-hidden bg-ink text-bone">
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/auto.jpg" alt="" className="w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/70 to-ink/30" />
        </div>
        <div className="relative z-10 px-6 md:px-14 pt-16 md:pt-20 pb-14">
          <Eyebrow className="!text-sol">Service · Auto</Eyebrow>
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-8 mt-7">
            <h1 className="display text-[64px] md:text-[112px] leading-[0.92] max-w-[800px]">
              FOUR TIERS.
              <br />
              TWO-BUCKET
              <br />
              METHOD.
              <br />
              <span className="text-sol">ALWAYS.</span>
            </h1>
            <p className="max-w-[360px] text-base md:text-lg leading-relaxed text-bone/75">
              Foam pre-soak. Microfiber per panel. Ceramic-safe wax. Every wash, every pro. We don&rsquo;t cut corners —
              we round them.
            </p>
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

      {/* Tier comparison */}
      <section className="px-6 md:px-14 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border border-mist">
          {tiers.map((tier, i) => (
            <div
              key={tier.tag}
              className={`p-7 min-h-[480px] flex flex-col justify-between ${
                i < tiers.length - 1 ? "lg:border-r border-b lg:border-b-0 border-mist" : ""
              } ${tier.featured ? "bg-royal text-bone relative" : "bg-bone text-ink"}`}
            >
              {tier.featured && <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />}
              <div>
                <div className="flex justify-between mb-8">
                  <span className="font-mono text-[11px] opacity-60">{tier.tag} / 04</span>
                  {tier.featured && (
                    <span className="font-mono text-[10px] text-sol px-2 py-1 border border-sol uppercase">
                      Popular
                    </span>
                  )}
                </div>
                <div className="display text-[32px] leading-tight mb-1">{tier.name.toUpperCase()}</div>
                <div className="font-mono text-xs tabular opacity-60">{tier.time.toUpperCase()}</div>
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
                  <span className={`display tabular text-[52px] leading-none ${tier.featured ? "text-sol" : "text-ink"}`}>
                    {tier.price}
                  </span>
                  <span className={`font-mono text-sm tabular line-through ${tier.featured ? "text-bone/50" : "text-smoke"}`}>
                    {tier.was}
                  </span>
                </div>
                <div className={`font-mono text-[10px] uppercase tracking-wider mb-4 ${tier.featured ? "text-sol/80" : "text-royal"}`}>
                  Launch promo · 90 days
                </div>
                <Link
                  href={`/app/book/auto?tier=${encodeURIComponent(tier.name)}`}
                  className={`block w-full text-center py-3.5 text-sm font-bold uppercase tracking-wide transition-colors ${
                    tier.featured ? "bg-sol text-ink hover:bg-bone" : "bg-ink text-bone hover:bg-royal"
                  }`}
                >
                  Book {tier.name} →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Membership callout — Auto plans surface */}
      <section className="px-6 md:px-14 py-16 bg-royal text-bone relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-end">
          <div className="lg:col-span-2">
            <Eyebrow className="!text-sol" prefix={null}>SHEEN+ for autos</Eyebrow>
            <h2 className="display text-[40px] md:text-[64px] leading-tight mt-4">
              WASH WEEKLY.
              <br />
              <span className="text-sol">PAY ONCE.</span>
            </h2>
            <p className="text-sm md:text-base text-bone/80 mt-5 max-w-[520px] leading-relaxed">
              Sheen+ Basic is $39/mo (promo · normally $49) for 4 Express washes —
              pays for itself at your second wash. Pro is $79/mo (promo · normally $99)
              for 4 Full Detail + 1 Premium. Sign up during launch and the rate
              locks for life.
            </p>
          </div>
          <div className="space-y-2">
            <div className="bg-bone/10 p-4 border-l-2 border-sol">
              <div className="display text-xl">SHEEN+ Basic</div>
              <div className="flex items-baseline gap-2 mt-1">
                <div className="display tabular text-3xl text-sol">$39/mo</div>
                <div className="font-mono text-xs tabular text-bone/50 line-through">$49</div>
              </div>
              <div className="text-xs text-bone/70 mt-1">4 Express · 2× points</div>
            </div>
            <div className="bg-bone/10 p-4 border-l-2 border-sol">
              <div className="display text-xl">SHEEN+ Pro</div>
              <div className="flex items-baseline gap-2 mt-1">
                <div className="display tabular text-3xl text-sol">$79/mo</div>
                <div className="font-mono text-xs tabular text-bone/50 line-through">$99</div>
              </div>
              <div className="text-xs text-bone/70 mt-1">4 Full + 1 Premium · 3× points</div>
            </div>
            <Link
              href="/app/membership"
              className="block w-full bg-sol text-ink py-3.5 mt-3 text-xs font-bold uppercase tracking-wide hover:bg-bone transition text-center"
            >
              Compare all plans →
            </Link>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="px-6 md:px-14 py-20 bg-mist/40">
        <div className="flex justify-between items-end mb-10">
          <h2 className="display text-[44px] md:text-[64px] leading-none">THE WORK.</h2>
          <Eyebrow>Recent jobs · LA</Eyebrow>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {gallery.map(([l, loc, img]) => (
            <div key={l}>
              <Placeholder label={l} src={img} height={260} />
              <div className="flex justify-between mt-2.5">
                <span className="text-xs font-bold uppercase">{l}</span>
                <span className="font-mono text-[11px] text-smoke">{loc.toUpperCase()}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 md:px-14 py-24">
        <h2 className="display text-[44px] md:text-[64px] leading-none mb-12">QUESTIONS, ANSWERED.</h2>
        <div>
          {faq.map(([q, a], i) => (
            <div
              key={q}
              className={`grid grid-cols-[40px_1fr] md:grid-cols-[60px_1fr_1.4fr_40px] gap-4 md:gap-8 py-7 border-b border-mist items-start ${
                i === 0 ? "border-t border-ink" : ""
              }`}
            >
              <span className="font-mono text-[11px] text-royal mt-1 font-bold">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-base md:text-lg font-bold uppercase tracking-tight">{q}</span>
              <span className="col-span-2 md:col-span-1 text-sm text-smoke leading-relaxed">{a}</span>
              <span className="hidden md:block text-lg text-sol justify-self-end">+</span>
            </div>
          ))}
        </div>
      </section>

      <MFooter />
    </>
  );
}

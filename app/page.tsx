import Link from "next/link";
import { MNav } from "@/components/marketing/MNav";
import { MFooter } from "@/components/marketing/MFooter";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { Placeholder } from "@/components/marketing/Placeholder";

const categories = [
  { tag: "01", label: "Auto", tiers: "4 tiers", from: "$35", desc: "Express wash → showroom-grade paint correction.", href: "/auto" },
  { tag: "02", label: "Home", tiers: "4 tiers", from: "$185", desc: "Driveways, siding, decks, solar panels.", href: "/home" },
  { tag: "03", label: "Commercial", tiers: "Quoted", from: "Custom", desc: "Storefronts, fleets, post-construction.", href: "/business" },
];

const steps = [
  { n: "01", t: "Pick your service", d: "Express, full detail, premium, showroom. Or home power-wash. Or commercial." },
  { n: "02", t: "Drop a pin", d: "Confirm address. Today, tomorrow, this week — pick the window." },
  { n: "03", t: "A pro shows up", d: "Vetted, insured, background-checked. Live arrival tracking. Driver photo." },
  { n: "04", t: "Pay & rate", d: "Apple Pay default. Tip 100% to the pro. Two-bucket method, every time." },
];

const trust = [
  { k: "$2,500", v: "Damage guarantee" },
  { k: "$1M", v: "GL insurance · every wash" },
  { k: "100%", v: "Tips to the pro" },
  { k: "4.9 ★", v: "14,200+ ratings" },
];

export default function Home() {
  return (
    <>
      <MNav />

      <section className="px-6 md:px-14 pt-16 md:pt-20 pb-16">
        <Eyebrow>On-demand wash & detail · Los Angeles</Eyebrow>
        <h1 className="display mt-7 font-bold tracking-tight2 text-[64px] md:text-[112px] leading-[0.92] max-w-[1100px]">
          Make it
          <br />
          <span className="cobalt-strike not-italic">look sharp.</span>
        </h1>
        <div className="mt-12 md:mt-14 flex flex-col md:flex-row md:justify-between md:items-end gap-8 md:gap-14">
          <p className="text-base md:text-lg leading-relaxed max-w-[460px] text-ink/80">
            Book a vetted local pro in 60 seconds. Your car, your home, your storefront — professionally cleaned,
            payment handled, no contractors arguing in your driveway.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/app/book"
              className="bg-ink text-bone rounded-full px-7 py-4 text-sm font-semibold hover:opacity-90"
            >
              Book in 60 seconds →
            </Link>
            <Link
              href="#how-it-works"
              className="border border-ink rounded-full px-7 py-4 text-sm font-semibold hover:bg-ink hover:text-bone"
            >
              How it works
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-14 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {categories.map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="bg-mist/50 p-7 min-h-[360px] flex flex-col justify-between hover:bg-mist transition-colors"
            >
              <div className="flex justify-between text-[11px] font-mono text-smoke">
                <span>{c.tag} / 03</span>
                <span>{c.tiers}</span>
              </div>
              <Placeholder label={`${c.label.toLowerCase()} — full-bleed photo`} height={140} className="my-6" />
              <div>
                <div className="display text-[40px] leading-none mb-2">{c.label}</div>
                <p className="text-sm text-smoke mb-4 min-h-[36px]">{c.desc}</p>
                <div className="flex justify-between items-center pt-4 border-t border-mist">
                  <span className="font-mono text-xs tabular">FROM {c.from}</span>
                  <span className="text-sm font-semibold">Book →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="px-6 md:px-14 py-20 bg-mist/40">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-12">
          <h2 className="display text-[40px] md:text-[56px] leading-none max-w-[600px]">
            Book in sixty
            <br />
            seconds. Done
            <br />
            before lunch.
          </h2>
          <Eyebrow>How it works</Eyebrow>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s) => (
            <div key={s.n} className="pt-6 border-t border-ink">
              <span className="font-mono text-xs text-smoke">{s.n}</span>
              <div className="display text-[22px] leading-tight mt-3 mb-2">{s.t}</div>
              <p className="text-sm text-smoke leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-14 py-10 bg-ink text-bone">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-6 md:gap-x-8 items-center">
          {trust.map((s, i) => (
            <div key={s.k} className={i > 0 ? "md:border-l md:border-bone/15 md:pl-6" : ""}>
              <div className="display tabular text-3xl md:text-4xl leading-none">{s.k}</div>
              <div className="font-mono text-[11px] uppercase opacity-60 mt-2">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-14 py-24 bg-bone">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-14 items-center">
          <div className="lg:col-span-2">
            <Eyebrow className="!text-cobalt" prefix={null}>★ ★ ★ ★ ★</Eyebrow>
            <blockquote className="display text-[28px] md:text-[44px] leading-tight mt-5 font-semibold tracking-tight">
              &ldquo;Marcus showed up in a black truck, foam pre-soak, two-bucket method, the works. My GT3 has never
              looked this clean. He&rsquo;ll be here every other Saturday.&rdquo;
            </blockquote>
            <div className="mt-8 flex gap-3 items-center">
              <div className="w-10 h-10 rounded-full bg-mist" />
              <div>
                <div className="text-sm font-semibold">Daniela R.</div>
                <div className="text-xs text-smoke">Manhattan Beach · Premium Detail</div>
              </div>
            </div>
          </div>
          <Placeholder label="customer + car after wash" height={360} />
        </div>
      </section>

      <section className="px-6 md:px-14 py-24 md:py-32 bg-cobalt text-bone text-center">
        <Eyebrow className="!text-bone/70" prefix={null}>
          Ready when you are
        </Eyebrow>
        <h2 className="display mt-6 mb-8 text-[64px] md:text-[88px] leading-[0.95]">Get it sheened.</h2>
        <Link
          href="/app/book"
          className="inline-block bg-bone text-ink rounded-full px-9 py-5 text-base font-semibold hover:opacity-90"
        >
          Book in 60 seconds →
        </Link>
      </section>

      <MFooter />
    </>
  );
}

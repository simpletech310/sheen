import Link from "next/link";
import { MNav } from "@/components/marketing/MNav";
import { MFooter } from "@/components/marketing/MFooter";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { Placeholder } from "@/components/marketing/Placeholder";

const categories = [
  { tag: "01", label: "Auto", tiers: "4 tiers", from: "$35", desc: "Express wash → showroom-grade paint correction.", href: "/auto", img: "/img/auto.jpg" },
  { tag: "02", label: "Home", tiers: "4 tiers", from: "$185", desc: "Driveways, siding, decks, solar panels.", href: "/home", tone: "royal" as const },
  { tag: "03", label: "Commercial", tiers: "Quoted", from: "Custom", desc: "Storefronts, fleets, post-construction.", href: "/business", tone: "sol" as const },
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

      {/* Hero with full-bleed image background */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/hero.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/60 to-ink/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 px-6 md:px-14 pt-20 pb-32 md:pt-28 md:pb-40 text-bone">
          <Eyebrow className="!text-sol" prefix="──">
            On-demand wash & detail · Los Angeles
          </Eyebrow>
          <h1 className="display mt-6 text-[64px] md:text-[128px] leading-[0.92] max-w-[1100px]">
            MAKE IT
            <br />
            <span className="royal-strike">LOOK SHARP.</span>
          </h1>
          <div className="mt-10 md:mt-12 flex flex-col md:flex-row md:justify-between md:items-end gap-6 md:gap-14">
            <p className="text-base md:text-lg leading-relaxed max-w-[460px] text-bone/85">
              Book a vetted local pro in 60 seconds. Your car, your home, your storefront — professionally cleaned,
              payment handled, no contractors arguing in your driveway.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/app/book"
                className="bg-sol text-ink rounded-none px-7 py-4 text-sm font-bold uppercase tracking-wide hover:bg-bone transition-colors"
              >
                Book in 60 seconds →
              </Link>
              <Link
                href="#how-it-works"
                className="border border-bone text-bone rounded-none px-7 py-4 text-sm font-bold uppercase tracking-wide hover:bg-bone hover:text-ink transition-colors"
              >
                How it works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Category picker */}
      <section className="px-6 md:px-14 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {categories.map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="group bg-bone border border-mist hover:border-ink transition-all min-h-[420px] flex flex-col"
            >
              <div className="flex justify-between text-[11px] font-mono text-smoke px-6 pt-5">
                <span>{c.tag} / 03</span>
                <span>{c.tiers}</span>
              </div>
              <Placeholder
                label={`${c.label.toLowerCase()}`}
                height={200}
                tone={(c as any).tone ?? "mist"}
                src={(c as any).img}
                className="my-5 mx-6"
              />
              <div className="px-6 pb-5 mt-auto">
                <div className="display text-[44px] leading-none mb-2 group-hover:text-royal transition-colors">{c.label}</div>
                <p className="text-sm text-smoke mb-4 min-h-[36px]">{c.desc}</p>
                <div className="flex justify-between items-center pt-4 border-t border-mist">
                  <span className="font-mono text-xs tabular">FROM {c.from}</span>
                  <span className="text-sm font-bold uppercase">Book →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 md:px-14 py-20 bg-ink text-bone">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-12">
          <h2 className="display text-[44px] md:text-[64px] leading-none max-w-[600px]">
            BOOK IN SIXTY
            <br />
            SECONDS. DONE
            <br />
            BEFORE LUNCH.
          </h2>
          <Eyebrow className="!text-sol" prefix={null}>How it works</Eyebrow>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s) => (
            <div key={s.n} className="pt-6 border-t border-bone">
              <span className="font-mono text-xs text-sol">{s.n}</span>
              <div className="display text-[24px] leading-tight mt-3 mb-2">{s.t.toUpperCase()}</div>
              <p className="text-sm text-bone/70 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust strip — Rams horn stripe */}
      <section className="bg-royal text-bone">
        <div className="px-6 md:px-14 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-6 md:gap-x-8 items-center">
            {trust.map((s, i) => (
              <div key={s.k} className={i > 0 ? "md:border-l md:border-bone/25 md:pl-6" : ""}>
                <div className="display tabular text-3xl md:text-5xl leading-none text-sol">{s.k}</div>
                <div className="font-mono text-[11px] uppercase opacity-80 mt-3">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Gold horn stripe at bottom */}
        <div className="h-2 bg-sol" />
      </section>

      {/* Featured image grid — proof of work */}
      <section className="px-6 md:px-14 py-20">
        <div className="flex justify-between items-end mb-10">
          <h2 className="display text-[44px] md:text-[56px] leading-none">THE WORK.</h2>
          <Eyebrow>Recent jobs · LA</Eyebrow>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Placeholder label="GT-R · pressure wash" src="/img/washer.jpg" height={260} />
          <Placeholder label="Mustang · showroom" src="/img/showroom.jpg" height={260} />
          <Placeholder label="Panamera Turbo · premium" src="/img/og-default.jpg" height={260} />
          <Placeholder label="4Runner · full detail" src="/img/auto-detail.jpg" height={260} />
        </div>
      </section>

      {/* Testimonial */}
      <section className="px-6 md:px-14 py-24 bg-bone">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-14 items-center">
          <div className="lg:col-span-2">
            <Eyebrow className="!text-royal" prefix={null}>★ ★ ★ ★ ★</Eyebrow>
            <blockquote className="text-[28px] md:text-[40px] leading-tight mt-5 font-bold tracking-tight">
              &ldquo;Marcus showed up in a black truck, foam pre-soak, two-bucket method, the works. My GT3 has never
              looked this clean. He&rsquo;ll be here every other Saturday.&rdquo;
            </blockquote>
            <div className="mt-8 flex gap-3 items-center">
              <div className="w-12 h-12 rounded-full bg-royal text-bone flex items-center justify-center font-bold">
                D
              </div>
              <div>
                <div className="text-sm font-bold">Daniela R.</div>
                <div className="text-xs text-smoke">Manhattan Beach · Premium Detail</div>
              </div>
            </div>
          </div>
          <Placeholder label="customer + car after wash" src="/img/auto.jpg" height={400} />
        </div>
      </section>

      {/* CTA strip — royal block, gold strike */}
      <section className="px-6 md:px-14 py-24 md:py-32 bg-ink text-bone text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-2 bg-sol" />
        <Eyebrow className="!text-sol" prefix={null}>
          Ready when you are
        </Eyebrow>
        <h2 className="display mt-6 mb-8 text-[64px] md:text-[112px] leading-[0.95]">
          GET IT <span className="text-sol">SHEENED.</span>
        </h2>
        <Link
          href="/app/book"
          className="inline-block bg-sol text-ink px-9 py-5 text-base font-bold uppercase tracking-wide hover:bg-bone transition-colors"
        >
          Book in 60 seconds →
        </Link>
      </section>

      <MFooter />
    </>
  );
}

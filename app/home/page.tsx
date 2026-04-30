import Link from "next/link";
import { MNav } from "@/components/marketing/MNav";
import { MFooter } from "@/components/marketing/MFooter";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { Placeholder } from "@/components/marketing/Placeholder";

const tiers = [
  { name: "Driveway & Walkway", desc: "Up to 800 sq ft", price: "$185", time: "90 min" },
  { name: "Full Exterior", desc: "House siding + drive + walks", price: "$385", time: "4 hr" },
  { name: "Deck/Patio Add-on", desc: "Deck or patio cleaning", price: "$95", time: "60 min" },
  { name: "Solar Panel Wash", desc: "Per panel", price: "$12", time: "5 min/panel" },
];

export const metadata = { title: "Home power-wash — Sheen" };

export default function HomePage() {
  return (
    <>
      <MNav />
      <section className="relative overflow-hidden bg-royal text-bone">
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/home.jpg" alt="" className="w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-r from-royal/95 via-royal/70 to-royal/30" />
        </div>
        <div className="relative z-10 px-6 md:px-14 pt-16 md:pt-20 pb-14">
          <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
          <Eyebrow className="!text-sol">Service · Home</Eyebrow>
        <h1 className="display text-[64px] md:text-[112px] leading-[0.92] max-w-[900px] mt-7">
          DRIVEWAYS, DECKS,
          <br />
          SIDING, PANELS.
          <br />
          <span className="text-sol">CLEANED RIGHT.</span>
        </h1>
        <p className="mt-8 max-w-[520px] text-base md:text-lg leading-relaxed text-bone/80">
          Soft-wash certified pros for siding. Pressure-washed concrete. Deck-safe pH. Solar panel cleanings that
          actually move output. No deposit, transparent pricing.
        </p>
        </div>
      </section>

      <section className="px-6 md:px-14 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tiers.map((t) => (
            <div key={t.name} className="bg-mist/40 p-7 flex justify-between gap-4">
              <div>
                <div className="display text-[28px] leading-tight">{t.name.toUpperCase()}</div>
                <div className="text-sm text-smoke mt-2">{t.desc}</div>
                <div className="font-mono text-[11px] text-smoke mt-3 tabular">{t.time.toUpperCase()}</div>
              </div>
              <div className="text-right">
                <div className="display tabular text-4xl mb-3 text-royal">{t.price}</div>
                <Link
                  href="/app/book"
                  className="inline-block bg-ink text-bone px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-royal"
                >
                  Book →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-14 py-16 bg-ink text-bone">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Placeholder label="driveway · before" tone="ink" height={220} src="/img/driveway_before.jpg" />
          <Placeholder label="driveway · after" tone="royal" height={220} src="/img/driveway_after.jpg" />
          <Placeholder label="siding · before" tone="ink" height={220} src="/img/siding_before.jpg" />
          <Placeholder label="siding · after" tone="sol" height={220} src="/img/siding_after.jpg" />
        </div>
      </section>

      <MFooter />
    </>
  );
}

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
      <section className="px-6 md:px-14 pt-16 md:pt-20 pb-14">
        <Eyebrow>Service · Home</Eyebrow>
        <h1 className="display text-[56px] md:text-[96px] leading-[0.92] max-w-[900px] mt-7">
          Driveways, decks,
          <br />
          siding, panels.
          <br />
          <span className="text-cobalt">Cleaned right.</span>
        </h1>
        <p className="mt-8 max-w-[520px] text-base md:text-lg leading-relaxed text-smoke">
          Soft-wash certified pros for siding. Pressure-washed concrete. Deck-safe pH. Solar panel cleanings that
          actually move output. No deposit, transparent pricing.
        </p>
      </section>

      <section className="px-6 md:px-14 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tiers.map((t) => (
            <div key={t.name} className="bg-mist/50 p-7 flex justify-between gap-4">
              <div>
                <div className="display text-2xl">{t.name}</div>
                <div className="text-sm text-smoke mt-2">{t.desc}</div>
                <div className="font-mono text-[11px] text-smoke mt-3 tabular">{t.time.toUpperCase()}</div>
              </div>
              <div className="text-right">
                <div className="display tabular text-3xl mb-3">{t.price}</div>
                <Link
                  href="/app/book"
                  className="inline-block bg-ink text-bone rounded-full px-4 py-2 text-xs font-semibold"
                >
                  Book →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-14 py-16 bg-mist/40">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {["driveway · before", "driveway · after", "siding · before", "siding · after"].map((l) => (
            <Placeholder key={l} label={l} height={200} tone="ink" />
          ))}
        </div>
      </section>

      <MFooter />
    </>
  );
}

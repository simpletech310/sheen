import Link from "next/link";
import { MNav } from "@/components/marketing/MNav";
import { MFooter } from "@/components/marketing/MFooter";
import { Eyebrow } from "@/components/brand/Eyebrow";

export const metadata = {
  title: "Trust & Safety — Sheen",
  description:
    "Vetted pros, $1M GL insurance, $2,500 damage guarantee, QR check-in, escrow until you approve.",
};

const items: { h: string; d: string }[] = [
  {
    h: "$2,500 damage guarantee",
    d: "Every wash is covered. File from the app within 24 hours of completion. Paid out from a platform-funded reserve — no fight with the pro's insurance.",
  },
  {
    h: "$1M GL insurance",
    d: "Required from every pro at onboarding. Document verified by ops, re-checked at expiry, auto-suspended if it lapses.",
  },
  {
    h: "Background checks",
    d: "Checkr-verified at onboarding. Two-strike auto-suspension at ≤2★ ratings within a 30-day window.",
  },
  {
    h: "QR check-in",
    d: "When the pro arrives they show a QR code — you scan with your phone camera or read off the 8-character code. Timer doesn't start until you confirm.",
  },
  {
    h: "Funds held in escrow",
    d: "Your card is charged at booking, but funds are held until the pro finishes AND you approve the work. One tap to release. We hold the line for you.",
  },
  {
    h: "Live arrival tracking",
    d: "Pro photo, vehicle, and live map from claimed → en-route → arrived. Geofence auto-flips status when they're within 150m.",
  },
  {
    h: "Tipping floor",
    d: "Pros can't see your tip until you submit a rating. No retaliation, no awkwardness. 100% goes to the pro, no platform cut.",
  },
  {
    h: "Penalty engine",
    d: "Automatic fees for late cancels, no-shows, and on-site issues — the same rules apply to you and the pro. Disputes go to ops within 48h.",
  },
];

const trust = [
  { k: "$2,500", v: "Damage guarantee" },
  { k: "$1M", v: "GL · every pro" },
  { k: "100%", v: "Tips to the pro" },
  { k: "Escrow", v: "Held until you approve" },
];

export default function SafetyPage() {
  return (
    <>
      <MNav />

      {/* Hero */}
      <section className="relative bg-ink text-bone px-6 md:px-14 pt-16 md:pt-20 pb-12">
        <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
        <Eyebrow className="!text-sol">Trust &amp; safety</Eyebrow>
        <h1 className="display text-[48px] md:text-[88px] leading-tight mt-6 max-w-[900px]">
          VETTED PROS. INSURED WORK.
          <br />
          <span className="text-sol">NO SURPRISES.</span>
        </h1>
        <p className="mt-6 max-w-[600px] text-base md:text-lg leading-relaxed text-bone/80">
          We built Sheen the way we wished the rest of the gig economy worked.
          Your money is held until you approve. Your pro is screened. Your
          driveway is covered.
        </p>
      </section>

      {/* Trust strip */}
      <section className="bg-royal text-bone relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
        <div className="px-6 md:px-14 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-6 items-center">
            {trust.map((s, i) => (
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
        <div className="h-1 bg-sol" />
      </section>

      {/* Safeguards grid */}
      <section className="px-6 md:px-14 py-20">
        <div className="flex justify-between items-end mb-10">
          <h2 className="display text-[36px] md:text-[56px] leading-none">SAFEGUARDS.</h2>
          <Eyebrow>What's behind every wash</Eyebrow>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((it, i) => (
            <div
              key={it.h}
              className="bg-mist/40 p-6 border-l-2 border-royal"
            >
              <div className="font-mono text-[10px] uppercase tracking-wider text-royal mb-2">
                {String(i + 1).padStart(2, "0")} · {it.h}
              </div>
              <p className="text-sm text-ink/80 leading-relaxed">{it.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-ink text-bone px-6 md:px-14 py-16 text-center relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
        <h2 className="display text-[36px] md:text-[56px] leading-tight mb-6">
          QUESTIONS ABOUT SAFETY?
        </h2>
        <p className="text-sm text-bone/70 max-w-md mx-auto mb-7">
          We answer in plain English, fast. Trust pages shouldn&rsquo;t need a
          decoder ring.
        </p>
        <Link
          href="mailto:hello@sheen.co"
          className="inline-block bg-sol text-ink px-9 py-4 text-sm font-bold uppercase tracking-wide hover:bg-bone transition"
        >
          Email hello@sheen.co →
        </Link>
      </section>

      <MFooter />
    </>
  );
}

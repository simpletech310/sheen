import Link from "next/link";
import { MNav } from "@/components/marketing/MNav";
import { MFooter } from "@/components/marketing/MFooter";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { EarningsCalc } from "@/components/marketing/EarningsCalc";
import { Placeholder } from "@/components/marketing/Placeholder";

export const metadata = { title: "Become a washer — Sheen" };

const split = [
  { side: "You bring", items: ["Your rig (water, power, tools)", "$1M GL insurance", "Reliable transport", "5★ standards"] },
  { side: "We bring", items: ["Customers in your radius", "Stripe payouts (same-day or instant)", "Background-check + Checkr", "Ratings + repeat-customer flow"] },
];

const equipment = [
  { t: "Pressure washer", d: "Min 1.6 GPM. Foam cannon a plus." },
  { t: "Two-bucket setup", d: "Wash + rinse buckets, microfiber towels, drying towels." },
  { t: "Water + power", d: "Carry your own tank or confirm site supply on arrival." },
  { t: "Detail kit", d: "Clay bar, wax, leather conditioner, tire shine, glass cleaner." },
  { t: "Big rig (optional)", d: "Long hose, ladder, telescoping brushes — unlocks 2–6× pay." },
  { t: "Insurance", d: "$1M GL. Upload PDF or photo at /pro/verify." },
];

const steps = [
  { n: "01", t: "Apply", d: "2-minute form. Tell us your equipment + service area." },
  { n: "02", t: "Verify", d: "Stripe payouts, insurance upload, background check. 24–48h." },
  { n: "03", t: "Start", d: "Jobs hit your queue. Accept, navigate, wash, get paid." },
];

const faq = [
  {
    q: "When do I get paid?",
    a: "Same-day standard. Instant payout for 1.5%. 100% of tips, every time, no skim.",
  },
  {
    q: "What does Sheen take?",
    a: "22% commission on first jobs. 18% on repeat customers. Tips are 100% yours.",
  },
  {
    q: "Do I need a truck?",
    a: "Reliable transport that can carry your gear. Many of our pros use a sedan + foldable kit.",
  },
  {
    q: "What if a customer is a no-show?",
    a: "Flag the job from the navigation page. The customer is auto-charged a no-show fee. You get paid for showing up.",
  },
];

export default function WashPage() {
  return (
    <>
      <MNav />
      <section className="relative overflow-hidden bg-ink text-bone">
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/washer.jpg" alt="" className="w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-transparent" />
        </div>
        <div className="relative z-10 px-6 md:px-14 pt-16 md:pt-20 pb-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-end">
            <div>
              <Eyebrow className="!text-sol">For washers</Eyebrow>
              <h1 className="display text-[64px] md:text-[104px] leading-[0.92] mt-7">
                SHOW UP.
                <br />
                WASH.
                <br />
                <span className="text-sol">GET PAID.</span>
              </h1>
              <p className="mt-7 max-w-[460px] text-base md:text-lg leading-relaxed text-bone/75">
                22% headline commission (lower than Uber/Lyft). 18% on repeat customers. 100% of tips, instant. Same-day
                standard payout, instant payout for 1.5%. No quotas.
              </p>
              <div className="mt-8 flex gap-3">
                <Link
                  href="/sign-up?role=washer"
                  className="bg-sol text-ink px-7 py-4 text-sm font-bold uppercase tracking-wide hover:bg-bone transition-colors"
                >
                  Apply in 2 minutes →
                </Link>
              </div>
            </div>
            <EarningsCalc />
          </div>
        </div>
      </section>

      <section className="px-6 md:px-14 py-16 bg-mist/40">
        <h2 className="display text-[40px] md:text-[56px] leading-tight mb-8">THE SPLIT.</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {split.map((c) => (
            <div key={c.side} className="bg-bone p-7 border border-mist">
              <Eyebrow>{c.side}</Eyebrow>
              <ul className="mt-4">
                {c.items.map((i) => (
                  <li key={i} className="py-2.5 border-t border-mist text-sm flex items-center gap-3">
                    <span className="text-royal">▶</span>
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-14 py-20 bg-bone">
        <div className="flex justify-between items-end mb-10">
          <h2 className="display text-[40px] md:text-[56px] leading-tight">YOUR KIT.</h2>
          <Eyebrow>Bring this</Eyebrow>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {equipment.map((e) => (
            <div key={e.t} className="border-l-2 border-royal bg-mist/40 p-5">
              <div className="font-mono text-[10px] uppercase tracking-wider text-royal">
                {e.t}
              </div>
              <p className="text-sm text-ink/80 mt-2 leading-relaxed">{e.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-14 py-20 bg-ink text-bone">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-12">
          <h2 className="display text-[40px] md:text-[56px] leading-none max-w-[600px]">
            APPLY → VERIFY
            <br />
            → <span className="text-sol">START.</span>
          </h2>
          <Eyebrow className="!text-sol" prefix={null}>How it works</Eyebrow>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div key={s.n} className="pt-6 border-t border-bone">
              <span className="font-mono text-xs text-sol">{s.n}</span>
              <div className="display text-[28px] leading-tight mt-3 mb-2">{s.t.toUpperCase()}</div>
              <p className="text-sm text-bone/70 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-14 py-20 bg-mist/30">
        <div className="flex justify-between items-end mb-10">
          <h2 className="display text-[40px] md:text-[56px] leading-tight">QUESTIONS.</h2>
          <Eyebrow>Pros ask</Eyebrow>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {faq.map((f) => (
            <details key={f.q} className="bg-bone border border-mist p-5 group">
              <summary className="display text-xl cursor-pointer flex justify-between items-center">
                <span>{f.q}</span>
                <span className="text-royal ml-3 group-open:rotate-45 transition">+</span>
              </summary>
              <p className="text-sm text-ink/75 mt-3 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="bg-royal text-bone px-6 md:px-14 py-20 text-center relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
        <h2 className="display text-[44px] md:text-[72px] leading-tight">JOIN THE FLEET.</h2>
        <p className="mt-4 max-w-md mx-auto opacity-80 text-sm">
          $1M GL required. Background check via Checkr. Onboarding in ~2 minutes.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/sign-up?role=washer"
            className="inline-block bg-sol text-ink px-9 py-5 text-base font-bold uppercase tracking-wide hover:bg-bone transition-colors"
          >
            Apply now →
          </Link>
          <Link
            href="/sign-in?role=washer"
            className="inline-block border border-bone text-bone px-9 py-5 text-base font-bold uppercase tracking-wide hover:bg-bone hover:text-ink transition-colors"
          >
            Pro sign-in
          </Link>
        </div>
      </section>

      <MFooter />
    </>
  );
}

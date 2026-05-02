import Link from "next/link";
import { MNav } from "@/components/marketing/MNav";
import { MFooter } from "@/components/marketing/MFooter";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { EarningsCalc } from "@/components/marketing/EarningsCalc";

export const metadata = {
  title: "Wash for Sheen — keep 78–88% + 100% of tips",
  description:
    "Run your own book of business. Direct-request bookings are locked to you for 10 minutes — no queue race. Keep 78% on day one, up to 88% as you climb. 100% of tips, instant. Same-day payouts in LA.",
  alternates: { canonical: "/wash" },
  openGraph: {
    title: "Wash for Sheen — keep 78–88% + 100% of tips",
    description:
      "Direct customers are yours, locked for 10 minutes. Keep up to 88% + 100% of tips. Same-day payouts.",
    images: [{ url: "/img/washer.jpg", width: 1200, height: 630, alt: "Sheen — wash for us" }],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Wash for Sheen — keep 78–88% + 100% of tips",
    description: "Direct customers locked to you 10 min. Up to 88% + 100% tips. Same-day pay.",
    images: ["/img/washer.jpg"],
  },
};

const split = [
  { side: "You bring", items: ["Your rig (water, power, tools)", "$1M GL insurance", "Reliable transport", "Pride in the work"] },
  { side: "We bring", items: ["Customers in your radius", "Same-day or instant payouts", "Background check + verification", "Repeat-customer routing"] },
];

const equipment = [
  { t: "Pressure washer", d: "Min 1.6 GPM. Foam cannon a plus." },
  { t: "Two-bucket setup", d: "Wash + rinse buckets, microfiber towels, drying towels." },
  { t: "Water + power", d: "BYO tank/generator if the site doesn't have it. Customers tell us up front." },
  { t: "Detail kit", d: "Clay bar, wax, leather conditioner, tire shine, glass cleaner." },
  { t: "Big rig (optional)", d: "Long hose, ladder, telescoping brushes — unlocks 2–6× pay." },
  { t: "Insurance", d: "$1M GL. Upload PDF or photo at /pro/verify." },
];

const steps = [
  { n: "01", t: "Apply", d: "2-minute form. Tell us your equipment + service area." },
  { n: "02", t: "Verify", d: "Set up payouts, upload insurance, submit for background check. 24–48h." },
  { n: "03", t: "Start", d: "Jobs hit your queue. Accept, navigate, wash, get paid." },
];

// The doc's full 5-tier ladder ships in a follow-up. Today we honour the
// current rates (22%/18%) and preview the climb so applicants see the runway.
const ladder = [
  { name: "Rookie",   commission: "22%", keep: "78%", req: "Onboarded · COI on file" },
  { name: "Verified", commission: "20%", keep: "80%", req: "25 jobs · 4.5★ · zero complaints" },
  { name: "Pro",      commission: "18%", keep: "82%", req: "75 jobs · 4.7★ · <2% cancellations" },
  { name: "Elite",    commission: "15%", keep: "85%", req: "200 jobs · 4.8★ · zero damage claims", soon: true },
  { name: "Legend",   commission: "12%", keep: "88%", req: "500 jobs · 4.9★ · 1+ year tenure",     soon: true },
];

const promote = [
  {
    t: "Run your own book of business",
    d: "Sheen is the platform; the customers are yours. Every pro gets a personal @handle and shareable link. Customers book you by name — Sheen handles the payments, insurance, and disputes; you keep the relationship.",
  },
  {
    t: "10-minute exclusivity on every direct request",
    d: "When a customer books with your @handle, that wash is sent ONLY to you for 10 minutes — no queue race, no other pro can see or claim it. Accept on your terms. If you pass, it falls to the open queue so the customer's still covered.",
  },
  {
    t: "Repeat customers, lower take",
    d: "Once a customer is yours, the platform commission drops to 18% on every repeat job they book with you. Build a regular route and the math works in your favour.",
  },
  {
    t: "Tips, instantly, in full",
    d: "100% of tips route directly to your Stripe balance — no skim, no hold. Cash out same-day or instant.",
  },
];

const faq = [
  {
    q: "When do I get paid?",
    a: "Job pay lands in your Stripe balance the moment the customer approves the wash (or 24h auto-approve). Cash out instantly to your debit card any time you have a balance — Sheen draws on Stripe's instant_available balance, so a freshly funded wash is withdrawable in minutes, not 1–2 business days.",
  },
  {
    q: "What does Sheen take?",
    a: "22% on a customer's first job with you. 18% on every repeat. Tips are 100% yours, period. As you climb the tier ladder, your platform take drops further — Legend pros keep 88%.",
  },
  {
    q: "How does the @handle work?",
    a: "Pick a handle (@YOURNAME) once. Share your link, hand out a card, drop it in your bio. When a customer books with it, the booking is sent ONLY to you for 10 minutes — locked, no queue race. If you accept it's yours; if you pass it falls to the open queue so the customer is still covered.",
  },
  {
    q: "Do I need a truck?",
    a: "Reliable transport that can carry your gear. Plenty of our pros use a sedan + foldable kit.",
  },
  {
    q: "What if the site has no water or power?",
    a: "Customers answer those questions up front when booking — water, power, gate code, the works. If you don't BYO water/power, those specific jobs just don't show in your queue. No surprises on arrival.",
  },
  {
    q: "What if a customer is a no-show?",
    a: "Flag the job from the navigation page. The customer is auto-charged a no-show fee. You get paid for showing up.",
  },
  {
    q: "What about damage?",
    a: "Sheen carries $1M general liability on every wash and a $2,500 damage guarantee that covers small mishaps without you reaching for your own policy. We mediate every claim.",
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
                Run your own book of business on Sheen&rsquo;s platform.
                Direct customers are <strong>locked to you for 10 minutes</strong> —
                no queue race. Keep 78% day one, up to 88% as you climb.
                100% of tips, instant. Cash out same-day.
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

      <section id="earnings" className="px-6 md:px-14 py-16 bg-mist/40">
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

      {/* Tier ladder — preview the climb so applicants see the runway. */}
      <section className="px-6 md:px-14 py-20 bg-bone">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-10">
          <h2 className="display text-[40px] md:text-[56px] leading-tight max-w-[600px]">
            CLIMB THE
            <br />
            <span className="text-royal">LADDER.</span>
          </h2>
          <Eyebrow>Earn down · keep more</Eyebrow>
        </div>
        <p className="text-sm text-smoke max-w-[640px] leading-relaxed mb-8">
          Quality is the engine. Hit the milestones, keep more of every wash. Rookie and Verified are live today —
          Pro/Elite/Legend roll out as the network scales.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          {ladder.map((t, i) => (
            <div
              key={t.name}
              className={`p-5 border-l-2 ${t.soon ? "bg-mist/30 border-mist" : "bg-bone border-royal"}`}
            >
              <div className="font-mono text-[10px] uppercase tracking-wider text-smoke">
                Tier {i + 1}{t.soon ? " · soon" : ""}
              </div>
              <div className={`display text-[22px] mt-1 ${t.soon ? "text-smoke" : "text-ink"}`}>{t.name}</div>
              <div className="display tabular text-3xl mt-3">
                <span className={t.soon ? "text-smoke" : "text-royal"}>{t.keep}</span>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-smoke mt-1">
                You keep · {t.commission} take
              </div>
              <div className="text-xs text-smoke mt-3 leading-snug">{t.req}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Promote yourself — the bookings-direct-to-you story. */}
      <section id="promote" className="px-6 md:px-14 py-20 bg-mist/40">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-10">
          <h2 className="display text-[40px] md:text-[56px] leading-tight max-w-[640px]">
            BRING YOUR
            <br />
            OWN <span className="text-royal">CUSTOMERS.</span>
          </h2>
          <Eyebrow>Your book of business</Eyebrow>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {promote.map((p) => (
            <div key={p.t} className="bg-bone p-6 border-l-2 border-royal">
              <div className="font-mono text-[10px] uppercase tracking-wider text-royal">{p.t}</div>
              <p className="text-sm text-ink/80 mt-3 leading-relaxed">{p.d}</p>
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

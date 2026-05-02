import Link from "next/link";
import { getTranslations } from "next-intl/server";
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

export default async function WashPage() {
  const t = await getTranslations("wash");
  const tc = await getTranslations("common");

  const split = [
    {
      side: t("splitYouBring"),
      items: [t("splitYou1"), t("splitYou2"), t("splitYou3"), t("splitYou4")],
    },
    {
      side: t("splitWeBring"),
      items: [t("splitWe1"), t("splitWe2"), t("splitWe3"), t("splitWe4")],
    },
  ];

  const equipment = [
    { t: t("kit1Title"), d: t("kit1Desc") },
    { t: t("kit2Title"), d: t("kit2Desc") },
    { t: t("kit3Title"), d: t("kit3Desc") },
    { t: t("kit4Title"), d: t("kit4Desc") },
    { t: t("kit5Title"), d: t("kit5Desc") },
    { t: t("kit6Title"), d: t("kit6Desc") },
  ];

  const steps = [
    { n: "01", t: t("step1Title"), d: t("step1Desc") },
    { n: "02", t: t("step2Title"), d: t("step2Desc") },
    { n: "03", t: t("step3Title"), d: t("step3Desc") },
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
    { t: t("promote1Title"), d: t("promote1Desc") },
    { t: t("promote2Title"), d: t("promote2Desc") },
    { t: t("promote3Title"), d: t("promote3Desc") },
    { t: t("promote4Title"), d: t("promote4Desc") },
  ];

  const faq = [
    { q: t("faq1Q"), a: t("faq1A") },
    { q: t("faq2Q"), a: t("faq2A") },
    { q: t("faq3Q"), a: t("faq3A") },
    { q: t("faq4Q"), a: t("faq4A") },
    { q: t("faq5Q"), a: t("faq5A") },
    { q: t("faq6Q"), a: t("faq6A") },
    { q: t("faq7Q"), a: t("faq7A") },
  ];

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
              <Eyebrow className="!text-sol">{t("eyebrow")}</Eyebrow>
              <h1 className="display text-[64px] md:text-[104px] leading-[0.92] mt-7">
                {t("headlineLine1")}
                <br />
                {t("headlineLine2")}
                <br />
                <span className="text-sol">{t("headlineLine3")}</span>
              </h1>
              <p className="mt-7 max-w-[460px] text-base md:text-lg leading-relaxed text-bone/75">
                {t("subhead")}
              </p>
              <div className="mt-8 flex gap-3">
                <Link
                  href="/sign-up?role=washer"
                  className="bg-sol text-ink px-7 py-4 text-sm font-bold uppercase tracking-wide hover:bg-bone transition-colors"
                >
                  {t("applyCta")}
                </Link>
              </div>
            </div>
            <EarningsCalc />
          </div>
        </div>
      </section>

      <section id="earnings" className="px-6 md:px-14 py-16 bg-mist/40">
        <h2 className="display text-[40px] md:text-[56px] leading-tight mb-8">{t("splitHeadline")}</h2>
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
          <h2 className="display text-[40px] md:text-[56px] leading-tight">{t("kitHeadline")}</h2>
          <Eyebrow>{t("kitEyebrow")}</Eyebrow>
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
            {t("ladderHeadlineA")}
            <br />
            <span className="text-royal">{t("ladderHeadlineB")}</span>
          </h2>
          <Eyebrow>{t("ladderEyebrow")}</Eyebrow>
        </div>
        <p className="text-sm text-smoke max-w-[640px] leading-relaxed mb-8">
          {t("ladderBody")}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          {ladder.map((tier, i) => (
            <div
              key={tier.name}
              className={`p-5 border-l-2 ${tier.soon ? "bg-mist/30 border-mist" : "bg-bone border-royal"}`}
            >
              <div className="font-mono text-[10px] uppercase tracking-wider text-smoke">
                {t("ladderTier")} {i + 1}{tier.soon ? ` · ${t("ladderSoon")}` : ""}
              </div>
              <div className={`display text-[22px] mt-1 ${tier.soon ? "text-smoke" : "text-ink"}`}>{tier.name}</div>
              <div className="display tabular text-3xl mt-3">
                <span className={tier.soon ? "text-smoke" : "text-royal"}>{tier.keep}</span>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-smoke mt-1">
                {t("ladderYouKeep", { commission: tier.commission })}
              </div>
              <div className="text-xs text-smoke mt-3 leading-snug">{tier.req}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Promote yourself — the bookings-direct-to-you story. */}
      <section id="promote" className="px-6 md:px-14 py-20 bg-mist/40">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-10">
          <h2 className="display text-[40px] md:text-[56px] leading-tight max-w-[640px]">
            {t("promoteHeadlineA")}
            <br />
            <span className="text-royal">{t("promoteHeadlineB")}</span>
          </h2>
          <Eyebrow>{t("promoteEyebrow")}</Eyebrow>
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
            {t("stepsHeadlineA")}
            <br />
            <span className="text-sol">{t("stepsHeadlineB")}</span>
          </h2>
          <Eyebrow className="!text-sol" prefix={null}>{tc("howItWorks")}</Eyebrow>
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
          <h2 className="display text-[40px] md:text-[56px] leading-tight">{t("faqHeadline")}</h2>
          <Eyebrow>{t("faqEyebrow")}</Eyebrow>
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
        <h2 className="display text-[44px] md:text-[72px] leading-tight">{t("joinHeadline")}</h2>
        <p className="mt-4 max-w-md mx-auto opacity-80 text-sm">
          {t("joinSubhead")}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/sign-up?role=washer"
            className="inline-block bg-sol text-ink px-9 py-5 text-base font-bold uppercase tracking-wide hover:bg-bone transition-colors"
          >
            {t("applyNow")}
          </Link>
          <Link
            href="/sign-in?role=washer"
            className="inline-block border border-bone text-bone px-9 py-5 text-base font-bold uppercase tracking-wide hover:bg-bone hover:text-ink transition-colors"
          >
            {t("proSignIn")}
          </Link>
        </div>
      </section>

      <MFooter />
    </>
  );
}

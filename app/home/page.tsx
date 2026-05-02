import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MNav } from "@/components/marketing/MNav";
import { MFooter } from "@/components/marketing/MFooter";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { Placeholder } from "@/components/marketing/Placeholder";

export const metadata = {
  title: "Home pressure & soft-wash — Sheen LA",
  description:
    "Driveways, siding, decks, solar panels. Soft-wash certified pros, deck-safe pH, eco-runoff. Pay only after you approve, with finished-work photos every time. Same-day windows.",
  alternates: { canonical: "/home" },
  openGraph: {
    title: "Home pressure & soft-wash — Sheen LA",
    description:
      "Soft-wash certified. Pay only after you approve. Photos every time.",
    images: [{ url: "/img/home.jpg", width: 1200, height: 630, alt: "Sheen home power-wash" }],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Home pressure & soft-wash — Sheen LA",
    description: "Soft-wash certified. Pay after you approve.",
    images: ["/img/home.jpg"],
  },
};

export default async function HomePage() {
  // Server-side translations — `getTranslations` reads the locale from the
  // request (cookie-driven via i18n/request.ts), so the whole page rerenders
  // in the active language on each navigation. Common copy lives under
  // `common.*`; page-specific copy under `home.*`.
  const t = await getTranslations("home");
  const tc = await getTranslations("common");

  // Tiers + why-blocks are data — built from the catalog so labels localize
  // without forking the layout. Prices, times, and image paths stay constant.
  const tiers = [
    {
      tag: "01",
      name: t("tier1Name"),
      desc: t("tier1Desc"),
      price: "$129",
      was: "$159",
      time: t("tier1Time"),
    },
    {
      tag: "02",
      name: t("tier2Name"),
      desc: t("tier2Desc"),
      price: "$249",
      was: "$299",
      time: t("tier2Time"),
      featured: true,
    },
    {
      tag: "03",
      name: t("tier3Name"),
      desc: t("tier3Desc"),
      price: "$79",
      was: "$95",
      time: t("tier3Time"),
    },
    {
      tag: "04",
      name: t("tier4Name"),
      desc: t("tier4Desc"),
      price: "$99",
      was: "$129",
      time: t("tier4Time"),
    },
  ];

  const why = [
    { h: t("why1Title"), d: t("why1Desc") },
    { h: t("why2Title"), d: t("why2Desc") },
    { h: t("why3Title"), d: t("why3Desc") },
    { h: t("why4Title"), d: t("why4Desc") },
  ];

  return (
    <>
      <MNav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-royal text-bone">
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/home.jpg" alt="" className="w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-r from-royal/95 via-royal/70 to-royal/30" />
        </div>
        <div className="relative z-10 px-6 md:px-14 pt-16 md:pt-20 pb-14">
          <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
          <Eyebrow className="!text-sol">{t("eyebrow")}</Eyebrow>
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-8 mt-7">
            <h1 className="display text-[64px] md:text-[112px] leading-[0.92] max-w-[800px]">
              {t("headlineLine1")}
              <br />
              {t("headlineLine2")}
              <br />
              {t("headlineLine3")}
              <br />
              <span className="text-sol">{t("headlineLine4")}</span>
            </h1>
            <p className="max-w-[420px] text-base md:text-lg leading-relaxed text-bone/80">
              {t("subhead")}
            </p>
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/app/book?category=home"
              className="bg-sol text-ink px-7 py-4 text-sm font-bold uppercase tracking-wide hover:bg-bone transition"
            >
              {t("bookCta")}
            </Link>
            <Link
              href="#tiers"
              className="border border-bone text-bone px-7 py-4 text-sm font-bold uppercase tracking-wide hover:bg-bone hover:text-ink transition"
            >
              {t("seeTiers")}
            </Link>
          </div>
        </div>
      </section>

      {/* Why band */}
      <section className="px-6 md:px-14 py-16">
        <div className="flex justify-between items-end mb-10">
          <h2 className="display text-[36px] md:text-[56px] leading-none">{t("whyHeadline")}</h2>
          <Eyebrow>{t("whyEyebrow")}</Eyebrow>
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

      {/* Tier matrix — same shape as /auto and /big-rig */}
      <section id="tiers" className="px-6 md:px-14 py-16 bg-mist/30">
        <div className="flex justify-between items-end mb-10">
          <h2 className="display text-[36px] md:text-[56px] leading-none">{t("tiersHeadline")}</h2>
          <Eyebrow>{t("tiersEyebrow")}</Eyebrow>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border border-mist">
          {tiers.map((tier, i) => (
            <div
              key={tier.tag}
              className={`p-7 min-h-[400px] flex flex-col justify-between ${
                i < tiers.length - 1
                  ? "lg:border-r border-b lg:border-b-0 border-mist"
                  : ""
              } ${tier.featured ? "bg-royal text-bone relative" : "bg-bone text-ink"}`}
            >
              {tier.featured && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
              )}
              <div>
                <div className="flex justify-between mb-6">
                  <span className="font-mono text-[11px] opacity-60">
                    {tier.tag} / 04
                  </span>
                  {tier.featured && (
                    <span className="font-mono text-[10px] text-sol px-2 py-1 border border-sol uppercase">
                      {t("mostBooked")}
                    </span>
                  )}
                </div>
                <div className="display text-[26px] leading-tight mb-1">
                  {tier.name.toUpperCase()}
                </div>
                <div className="font-mono text-xs tabular opacity-60">
                  {tier.time.toUpperCase()}
                </div>
                <p
                  className={`text-sm mt-4 leading-relaxed ${
                    tier.featured ? "text-bone/85" : "text-smoke"
                  }`}
                >
                  {tier.desc}
                </p>
              </div>
              <div className="mt-6">
                <div className="flex items-baseline gap-2 mb-1">
                  <span
                    className={`display tabular text-[40px] leading-none ${
                      tier.featured ? "text-sol" : "text-royal"
                    }`}
                  >
                    {tier.price}
                  </span>
                  {tier.was && (
                    <span className={`font-mono text-sm tabular line-through ${tier.featured ? "text-bone/50" : "text-smoke"}`}>
                      {tier.was}
                    </span>
                  )}
                </div>
                <div className={`font-mono text-[10px] uppercase tracking-wider mb-4 ${tier.featured ? "text-sol/80" : "text-royal"}`}>
                  {t("launchPromo")}
                </div>
                <Link
                  href={`/app/book?category=home&tier=${encodeURIComponent(tier.name)}`}
                  className={`block w-full text-center py-3.5 text-sm font-bold uppercase tracking-wide transition ${
                    tier.featured
                      ? "bg-sol text-ink hover:bg-bone"
                      : "bg-ink text-bone hover:bg-royal"
                  }`}
                >
                  {tc("book")} →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Before/after gallery */}
      <section className="px-6 md:px-14 py-16 bg-ink text-bone">
        <div className="flex justify-between items-end mb-8">
          <h2 className="display text-[36px] md:text-[56px] leading-none">{t("beforeAfterHeadline")}</h2>
          <Eyebrow className="!text-sol" prefix={null}>{t("beforeAfterEyebrow")}</Eyebrow>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Placeholder label="driveway · before" tone="ink" height={220} src="/img/driveway_before.jpg" />
          <Placeholder label="driveway · after" tone="royal" height={220} src="/img/driveway_after.jpg" />
          <Placeholder label="siding · before" tone="ink" height={220} src="/img/siding_before.jpg" />
          <Placeholder label="siding · after" tone="sol" height={220} src="/img/siding_after.jpg" />
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-royal text-bone px-6 md:px-14 py-20 text-center relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
        <h2 className="display text-[44px] md:text-[72px] leading-tight">
          {t("ctaHeadlineA")} <span className="text-sol">{t("ctaHeadlineB")}</span>
        </h2>
        <p className="mt-4 max-w-md mx-auto opacity-80 text-sm">
          {t("ctaSubhead")}
        </p>
        <Link
          href="/app/book?category=home"
          className="mt-8 inline-block bg-sol text-ink px-9 py-5 text-base font-bold uppercase tracking-wide hover:bg-bone transition"
        >
          {t("bookCta")}
        </Link>
      </section>

      <MFooter />
    </>
  );
}

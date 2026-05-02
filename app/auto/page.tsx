import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MNav } from "@/components/marketing/MNav";
import { MFooter } from "@/components/marketing/MFooter";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { Placeholder } from "@/components/marketing/Placeholder";

export const metadata = {
  title: "Mobile car wash & auto detail in LA",
  description:
    "Express ($24) to Showroom ($159). A vetted Sheen pro shows up — two-bucket method, ceramic-safe, self-contained rig. Pay only after you approve the work, with 4 finished-work photos every time. $2,500 damage cover.",
  alternates: { canonical: "/auto" },
  openGraph: {
    title: "Mobile car wash & auto detail in LA — Sheen",
    description:
      "Express to Showroom. Pay only after you approve the work. 4 finished-work photos every time. $2,500 damage cover.",
    images: [{ url: "/img/auto.jpg", width: 1200, height: 630, alt: "Sheen mobile auto detail" }],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Mobile car wash & auto detail in LA",
    description: "Express to Showroom. Pay after you approve. Vetted local pros.",
    images: ["/img/auto.jpg"],
  },
};

export default async function AutoPage() {
  const t = await getTranslations("auto");
  const tc = await getTranslations("common");

  const why = [
    { h: t("why1Title"), d: t("why1Desc") },
    { h: t("why2Title"), d: t("why2Desc") },
    { h: t("why3Title"), d: t("why3Desc") },
    { h: t("why4Title"), d: t("why4Desc") },
  ];

  const tiers = [
    { tag: "01", name: t("tier1Name"), price: "$24",  was: "$29",  time: t("tier1Time"), items: ["Foam pre-soak", "Hand wash", "Dressed wheels & tires", "Streak-free glass"] },
    { tag: "02", name: t("tier2Name"), price: "$49",  was: "$59",  time: t("tier2Time"), items: ["Everything in Express", "Interior vacuum", "Dash + console wipe", "Mats lifted & cleaned"] },
    { tag: "03", name: t("tier3Name"), price: "$89",  was: "$109", time: t("tier3Time"), items: ["Everything in Full", "Clay-bar decontamination", "Hand-applied wax", "Leather conditioning"], featured: true },
    { tag: "04", name: t("tier4Name"), price: "$159", was: "$189", time: t("tier4Time"), items: ["Everything in Premium", "Paint correction", "Ceramic top-up", "Engine bay detail"] },
  ];

  const gallery: [string, string, string][] = [
    ["GT-R · pressure wash", "Beverly Hills", "/img/washer.jpg"],
    ["Mustang · showroom", "Pasadena", "/img/showroom.jpg"],
    ["Panamera · premium", "Long Beach", "/img/og-default.jpg"],
    ["4Runner · full detail", "Compton", "/img/auto-detail.jpg"],
  ];

  const faq: [string, string][] = [
    [t("faq1Q"), t("faq1A")],
    [t("faq2Q"), t("faq2A")],
    [t("faq3Q"), t("faq3A")],
    [t("faq4Q"), t("faq4A")],
    [t("faq5Q"), t("faq5A")],
    [t("faq6Q"), t("faq6A")],
    [t("faq7Q"), t("faq7A")],
  ];

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
          <Eyebrow className="!text-sol">{t("eyebrow")}</Eyebrow>
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-8 mt-7">
            <h1 className="display text-[64px] md:text-[112px] leading-[0.92] max-w-[800px]">
              {t("headlineLine1")}
              <br />
              {t("headlineLine2")}
              <br />
              <span className="text-sol">{t("headlineLine3")}</span>
            </h1>
            <p className="max-w-[360px] text-base md:text-lg leading-relaxed text-bone/75">
              {t("subhead")}
            </p>
          </div>
        </div>
      </section>

      {/* Why band */}
      <section className="px-6 md:px-14 py-16">
        <div className="flex justify-between items-end mb-10">
          <h2 className="display text-[36px] md:text-[56px] leading-none">{t("whyHeadline")}</h2>
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
                  {tc("book")} {tier.name} →
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
          <h2 className="display text-[44px] md:text-[64px] leading-none">{t("galleryHeadline")}</h2>
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
        <h2 className="display text-[44px] md:text-[64px] leading-none mb-12">{t("faqHeadline")}</h2>
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

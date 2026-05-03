import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MNav } from "@/components/marketing/MNav";
import { MFooter } from "@/components/marketing/MFooter";
import { Eyebrow } from "@/components/brand/Eyebrow";

export const metadata = {
  title: "Mobile big-rig & semi truck wash — LA + Inland Empire",
  description:
    "Mobile big-rig wash, polish, and paint correction — at the rest stop, the yard, or the customer's lot. Equipment-verified pros only. 24/7 in LA + Inland Empire. Pay only after you approve the finished work.",
  alternates: { canonical: "/big-rig" },
  openGraph: {
    title: "Mobile big-rig & semi truck wash — LA + Inland Empire",
    description:
      "Foam, polish, paint correction — at the yard or rest stop. Pay only after you approve.",
    images: [{ url: "/img/big-rig-hero.jpg", width: 1200, height: 630, alt: "Sheen big-rig mobile wash" }],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Mobile big-rig & semi truck wash — Sheen",
    description: "Foam, polish, paint correction. Pay after you approve.",
    images: ["/img/big-rig-hero.jpg"],
  },
};

export default async function BigRigPage() {
  // All visible copy comes from the `bigRig` namespace so the entire page
  // localizes when the user switches languages. Tier names, FAQ Q&A, and
  // membership labels are catalog-driven; only prices, times (units), and
  // image paths stay literal.
  const t = await getTranslations("bigRig");

  const tiers = [
    { tag: "01", name: t("tier1Name"), price: "$115", was: "$135", time: t("tier1Time"), items: t.raw("tier1Items") as string[] },
    { tag: "02", name: t("tier2Name"), price: "$215", was: "$245", time: t("tier2Time"), items: t.raw("tier2Items") as string[] },
    { tag: "03", name: t("tier3Name"), price: "$399", was: "$499", time: t("tier3Time"), items: t.raw("tier3Items") as string[], featured: true },
    { tag: "04", name: t("tier4Name"), price: "$649", was: "$799", time: t("tier4Time"), items: t.raw("tier4Items") as string[] },
  ];

  const memberships = [
    { name: t("m1Name"), price: t("m1Price"), desc: t("m1Desc"), fits: t.raw("m1Fits") as string[] },
    { name: t("m2Name"), price: t("m2Price"), desc: t("m2Desc"), fits: t.raw("m2Fits") as string[], featured: true },
    { name: t("m3Name"), price: t("m3Price"), desc: t("m3Desc"), fits: t.raw("m3Fits") as string[] },
  ];

  const why: { h: string; d: string }[] = [
    { h: t("why1Title"), d: t("why1Desc") },
    { h: t("why2Title"), d: t("why2Desc") },
    { h: t("why3Title"), d: t("why3Desc") },
    { h: t("why4Title"), d: t("why4Desc") },
    { h: t("why5Title"), d: t("why5Desc") },
  ];

  const faq: [string, string][] = [
    [t("faq1Q"), t("faq1A")],
    [t("faq2Q"), t("faq2A")],
    [t("faq3Q"), t("faq3A")],
    [t("faq4Q"), t("faq4A")],
  ];

  return (
    <>
      <MNav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-ink text-bone">
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/big-rig-hero.jpg" alt="" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-royal/95 via-ink/85 to-ink/40" />
        </div>
        <div className="relative z-10 px-6 md:px-14 pt-16 md:pt-20 pb-14">
          <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
          <Eyebrow className="!text-sol">{t("eyebrow")}</Eyebrow>
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-8 mt-7">
            <h1 className="display text-[56px] md:text-[104px] leading-[0.92] max-w-[800px] whitespace-pre-line">
              {t("headline")}
            </h1>
            <p className="max-w-[420px] text-base md:text-lg leading-relaxed text-bone/80">
              {t("subhead")}
            </p>
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/app/book?category=big_rig"
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

      {/* Tiers */}
      <section id="tiers" className="px-6 md:px-14 py-16 bg-mist/30">
        <div className="flex justify-between items-end mb-10">
          <h2 className="display text-[36px] md:text-[56px] leading-none">{t("tiersHeadline")}</h2>
          <Eyebrow>{t("tiersEyebrow")}</Eyebrow>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border border-mist">
          {tiers.map((tier, i) => (
            <div
              key={tier.tag}
              className={`p-7 min-h-[480px] flex flex-col justify-between ${
                i < tiers.length - 1
                  ? "lg:border-r border-b lg:border-b-0 border-mist"
                  : ""
              } ${tier.featured ? "bg-royal text-bone relative" : "bg-bone text-ink"}`}
            >
              {tier.featured && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
              )}
              <div>
                <div className="flex justify-between mb-8">
                  <span className="font-mono text-[11px] opacity-60">
                    {tier.tag} / 04
                  </span>
                  {tier.featured && (
                    <span className="font-mono text-[10px] text-sol px-2 py-1 border border-sol uppercase">
                      {t("mostBooked")}
                    </span>
                  )}
                </div>
                <div className="display text-[28px] leading-tight mb-1">
                  {tier.name.toUpperCase()}
                </div>
                <div className="font-mono text-xs tabular opacity-60">
                  {tier.time.toUpperCase()}
                </div>
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
                  <span
                    className={`display tabular text-[44px] leading-none ${
                      tier.featured ? "text-sol" : "text-ink"
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
                  href={`/app/book?category=big_rig&tier=${encodeURIComponent(tier.name)}`}
                  className={`block w-full text-center py-3.5 text-sm font-bold uppercase tracking-wide transition ${
                    tier.featured
                      ? "bg-sol text-ink hover:bg-bone"
                      : "bg-ink text-bone hover:bg-royal"
                  }`}
                >
                  {t("bookTier", { name: tier.name })}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Add-ons — full rig detailing menu, picked at booking */}
      <section className="px-6 md:px-14 py-16 bg-bone">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-end mb-8">
          <div className="lg:col-span-2">
            <Eyebrow>{t("addonsEyebrow")}</Eyebrow>
            <h2 className="display text-[40px] md:text-[56px] leading-tight mt-4">
              {t("addonsHeadlineA")}
              <br />
              <span className="text-royal">{t("addonsHeadlineB")}</span>
            </h2>
            <p className="text-sm md:text-base text-smoke mt-5 max-w-[560px] leading-relaxed">
              {t("addonsBlurb")}
            </p>
          </div>
          <Link
            href="/app/book/big-rig"
            className="bg-ink text-bone px-7 py-4 text-sm font-bold uppercase tracking-wide hover:bg-royal transition text-center"
          >
            {t("addonsCta")}
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {[
            { k: "degrease_undercarriage", price: "$99" },
            { k: "bug_tar_rig", price: "$79" },
            { k: "cab_shampoo", price: "$129" },
            { k: "aluminum_wheel_polish", price: "$149" },
            { k: "sleeper_deep_clean", price: "$179" },
            { k: "chrome_polish_premium", price: "$199" },
            { k: "ceramic_seal_rig", price: "$299" },
          ].map((a) => (
            <div key={a.k} className="border-l-2 border-royal bg-mist/40 p-4">
              <div className="font-mono text-[10px] uppercase tracking-wider text-royal">
                {t(`addon_${a.k}` as any)}
              </div>
              <div className="display tabular text-2xl mt-2 text-ink">{a.price}</div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-smoke mt-0.5">
                {t("addonsFromLabel")}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Memberships — Rig Solo, Rig Pro, Combined */}
      <section className="px-6 md:px-14 py-20">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-10">
          <div>
            <Eyebrow className="!text-royal" prefix={null}>
              {t("membershipsEyebrow")}
            </Eyebrow>
            <h2 className="display text-[36px] md:text-[56px] leading-tight mt-3">
              {t("membershipsHeadlineA")}
              <br />
              <span className="text-royal">{t("membershipsHeadlineB")}</span>
            </h2>
            <p className="text-sm text-smoke mt-3 max-w-md leading-relaxed">
              {t("membershipsBody")}
            </p>
          </div>
          <Link
            href="/app/membership"
            className="bg-ink text-bone px-6 py-4 text-sm font-bold uppercase tracking-wide hover:bg-royal transition self-start md:self-end"
          >
            {t("membershipsSubscribe")}
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {memberships.map((m) => (
            <div
              key={m.name}
              className={`relative p-6 border ${
                m.featured
                  ? "bg-royal text-bone border-royal"
                  : "bg-bone text-ink border-mist"
              }`}
            >
              {m.featured && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
              )}
              <div className="flex justify-between items-start mb-4">
                <div className="display text-[28px] leading-tight">
                  {m.name.toUpperCase()}
                </div>
                {m.featured && (
                  <span className="font-mono text-[10px] text-sol px-2 py-1 border border-sol uppercase">
                    {t("membershipsPopular")}
                  </span>
                )}
              </div>
              <div
                className={`display tabular text-4xl ${
                  m.featured ? "text-sol" : "text-royal"
                }`}
              >
                {m.price}
              </div>
              <p
                className={`text-sm mt-3 leading-relaxed ${
                  m.featured ? "text-bone/85" : "text-smoke"
                }`}
              >
                {m.desc}
              </p>
              <div className="mt-5 space-y-2">
                {m.fits.map((f) => (
                  <div
                    key={f}
                    className={`text-xs py-1.5 border-t ${
                      m.featured ? "border-bone/20" : "border-mist"
                    }`}
                  >
                    {f}
                  </div>
                ))}
              </div>
              <Link
                href="/app/membership"
                className={`mt-6 block text-center py-3 text-xs font-bold uppercase tracking-wide transition ${
                  m.featured
                    ? "bg-sol text-ink hover:bg-bone"
                    : "bg-ink text-bone hover:bg-royal"
                }`}
              >
                {t("chooseMembership", { name: m.name })}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 md:px-14 py-20 bg-ink text-bone">
        <div className="flex justify-between items-end mb-10">
          <h2 className="display text-[36px] md:text-[56px] leading-none">{t("faqHeadline")}</h2>
          <Eyebrow className="!text-sol" prefix={null}>{t("faqEyebrow")}</Eyebrow>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {faq.map(([q, a], i) => (
            <details
              key={q}
              className="bg-white/5 p-5 border-l-2 border-sol group"
            >
              <summary className="display text-xl cursor-pointer flex justify-between items-center text-bone">
                <span>{q}</span>
                <span className="text-sol ml-3 group-open:rotate-45 transition">+</span>
              </summary>
              <p className="text-sm text-bone/75 mt-3 leading-relaxed">{a}</p>
              <div className="font-mono text-[10px] text-bone/40 uppercase mt-3 tabular">
                {String(i + 1).padStart(2, "0")} / {String(faq.length).padStart(2, "0")}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-royal text-bone px-6 md:px-14 py-20 text-center relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
        <h2 className="display text-[44px] md:text-[72px] leading-tight">
          {t("closingHeadlineA")} <span className="text-sol">{t("closingHeadlineB")}</span>
        </h2>
        <p className="mt-4 max-w-md mx-auto opacity-80 text-sm">
          {t("closingSubhead")}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/app/book?category=big_rig"
            className="bg-sol text-ink px-9 py-5 text-base font-bold uppercase tracking-wide hover:bg-bone transition"
          >
            {t("bookCta")}
          </Link>
          <Link
            href="/app/membership"
            className="border border-bone text-bone px-9 py-5 text-base font-bold uppercase tracking-wide hover:bg-bone hover:text-ink transition"
          >
            {t("closingSeePlans")}
          </Link>
        </div>
      </section>

      <MFooter />
    </>
  );
}

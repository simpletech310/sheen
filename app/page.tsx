import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MNav } from "@/components/marketing/MNav";
import { MFooter } from "@/components/marketing/MFooter";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { Placeholder } from "@/components/marketing/Placeholder";

export default async function Home() {
  // Server-side translations — `getTranslations` reads the locale from the
  // request (cookie-driven via i18n/request.ts), so the whole page rerenders
  // in the active language on each navigation. Common copy lives under
  // `common.*`; page-specific copy under `landing.*`.
  const t = await getTranslations("landing");
  const tc = await getTranslations("common");

  // Categories, memberships, steps, and trust stats are data — built from the
  // catalog so the labels localize without forking the layout.
  const categories = [
    { tag: "01", tiers: t("tiersFour"), from: "$24",  was: "$29",  label: t("category.autoLabel"),       desc: t("category.autoDesc"),       href: "/auto",     img: "/img/auto.jpg" },
    { tag: "02", tiers: t("tiersFour"), from: "$115", was: "$135", label: t("category.bigRigLabel"),     desc: t("category.bigRigDesc"),     href: "/big-rig",  tone: "ink"   as const, img: "/img/big-rig-card.jpg" },
    { tag: "03", tiers: t("tiersFour"), from: "$79",  was: "$95",  label: t("category.homeLabel"),       desc: t("category.homeDesc"),       href: "/home",     tone: "royal" as const, img: "/img/home.jpg" },
    { tag: "04", tiers: t("tiersQuoted"), from: "Custom",          label: t("category.commercialLabel"), desc: t("category.commercialDesc"), href: "/business", tone: "sol"   as const, img: "/img/commercial.jpg" },
  ];

  const memberships = [
    { name: t("membershipBasic"), price: "$39/mo", was: "$49/mo", desc: t("membershipBasicDesc"), href: "/app/membership", category: t("category.autoLabel") },
    { name: t("membershipPro"),   price: "$79/mo", was: "$99/mo", desc: t("membershipProDesc"),   href: "/app/membership", category: t("category.autoLabel"), featured: true },
  ];

  const steps = [
    { n: "01", title: t("step1Title"), desc: t("step1Desc") },
    { n: "02", title: t("step2Title"), desc: t("step2Desc") },
    { n: "03", title: t("step3Title"), desc: t("step3Desc") },
    { n: "04", title: t("step4Title"), desc: t("step4Desc") },
  ];

  const trust = [
    { k: t("trustHeld"),       v: t("trustHeldLabel") },
    { k: t("trustPhotos"),     v: t("trustPhotosLabel") },
    { k: t("trustGuarantee"),  v: t("trustGuaranteeLabel") },
    { k: t("trustInsurance"), v: t("trustInsuranceLabel") },
  ];

  const recruitStats = [
    { k: t("recruitStat1"), v: t("recruitStat1Label") },
    { k: t("recruitStat2"), v: t("recruitStat2Label") },
    { k: t("recruitStat3"), v: t("recruitStat3Label") },
    { k: t("recruitStat4"), v: t("recruitStat4Label") },
  ];

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
            {t("eyebrow")}
          </Eyebrow>
          <h1 className="display mt-6 text-[64px] md:text-[128px] leading-[0.92] max-w-[1100px]">
            {t("headlineLine1")}
            <br />
            <span className="royal-strike">{t("headlineLine2")}</span>
          </h1>
          <div className="mt-10 md:mt-12 flex flex-col md:flex-row md:justify-between md:items-end gap-6 md:gap-14">
            <p className="text-base md:text-lg leading-relaxed max-w-[460px] text-bone/85">
              {t("subhead")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/app/book"
                className="bg-sol text-ink rounded-none px-7 py-4 text-sm font-bold uppercase tracking-wide hover:bg-bone transition-colors"
              >
                {tc("bookCta")}
              </Link>
              <Link
                href="#how-it-works"
                className="border border-bone text-bone rounded-none px-7 py-4 text-sm font-bold uppercase tracking-wide hover:bg-bone hover:text-ink transition-colors"
              >
                {tc("howItWorks")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Category picker — 4 services */}
      <section className="px-6 md:px-14 py-16 md:py-20">
        <div className="flex justify-between items-end mb-8">
          <h2 className="display text-[36px] md:text-[56px] leading-tight">{t("pickLane")}</h2>
          <Eyebrow>{t("fourServices")}</Eyebrow>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="group bg-bone border border-mist hover:border-ink transition-all min-h-[400px] flex flex-col"
            >
              <div className="flex justify-between text-[11px] font-mono text-smoke px-6 pt-5">
                <span>
                  {c.tag} / {String(categories.length).padStart(2, "0")}
                </span>
                <span>{c.tiers}</span>
              </div>
              <Placeholder
                label={`${c.label.toLowerCase()}`}
                height={180}
                tone={(c as any).tone ?? "mist"}
                src={(c as any).img}
                className="my-4 mx-6"
              />
              <div className="px-6 pb-5 mt-auto">
                <div className="display text-[36px] leading-none mb-2 group-hover:text-royal transition-colors">
                  {c.label.toUpperCase()}
                </div>
                <p className="text-sm text-smoke mb-4 min-h-[36px] leading-relaxed">{c.desc}</p>
                <div className="flex justify-between items-center pt-4 border-t border-mist">
                  <span className="font-mono text-xs tabular">
                    {tc("from").toUpperCase()} {c.from}
                    {(c as any).was && (
                      <span className="ml-1.5 text-smoke line-through">{(c as any).was}</span>
                    )}
                  </span>
                  <span className="text-sm font-bold uppercase group-hover:text-royal">{tc("book")} →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Membership band */}
      <section className="px-6 md:px-14 py-20 bg-mist/30">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-10">
          <div>
            <Eyebrow className="!text-royal" prefix={null}>{t("membershipEyebrow")}</Eyebrow>
            <h2 className="display text-[44px] md:text-[56px] leading-tight mt-3">
              {t("membershipHeadlineA")} <span className="text-royal">{t("membershipHeadlineB")}</span>
            </h2>
            <p className="text-sm text-smoke mt-3 max-w-md leading-relaxed">
              {t("membershipBody")}
            </p>
          </div>
          <Link
            href="/app/membership"
            className="bg-ink text-bone px-6 py-4 text-sm font-bold uppercase tracking-wide hover:bg-royal transition self-start md:self-end"
          >
            {t("membershipCompare")}
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memberships.map((m) => (
            <Link
              key={m.name}
              href={m.href}
              className={`group block p-7 transition border-l-2 ${
                m.featured
                  ? "bg-royal text-bone border-sol hover:bg-ink"
                  : "bg-bone text-ink border-royal hover:border-ink"
              }`}
            >
              <div
                className={`font-mono text-[10px] uppercase tracking-wider ${
                  m.featured ? "text-sol" : "text-smoke"
                }`}
              >
                {m.category}
                {m.featured && (
                  <span className="ml-2 px-1.5 py-0.5 border border-sol text-sol">
                    {t("membershipPopular")}
                  </span>
                )}
              </div>
              <div className="display text-[24px] leading-tight mt-3">
                {m.name.toUpperCase()}
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span
                  className={`display tabular text-3xl ${
                    m.featured ? "text-sol" : "text-royal"
                  }`}
                >
                  {m.price}
                </span>
                {(m as any).was && (
                  <span className={`font-mono text-xs tabular line-through ${m.featured ? "text-bone/50" : "text-smoke"}`}>
                    {(m as any).was}
                  </span>
                )}
              </div>
              <p
                className={`text-xs mt-3 leading-relaxed ${
                  m.featured ? "text-bone/80" : "text-smoke"
                }`}
              >
                {m.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 md:px-14 py-20 bg-ink text-bone">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-12">
          <h2 className="display text-[44px] md:text-[64px] leading-none max-w-[600px] whitespace-pre-line">
            {t("stepsHeadline")}
          </h2>
          <Eyebrow className="!text-sol" prefix={null}>{tc("howItWorks")}</Eyebrow>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s) => (
            <div key={s.n} className="pt-6 border-t border-bone">
              <span className="font-mono text-xs text-sol">{s.n}</span>
              <div className="display text-[24px] leading-tight mt-3 mb-2">{s.title.toUpperCase()}</div>
              <p className="text-sm text-bone/70 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust strip */}
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
        <div className="h-2 bg-sol" />
      </section>

      {/* Featured image grid */}
      <section className="px-6 md:px-14 py-20">
        <div className="flex justify-between items-end mb-10">
          <h2 className="display text-[44px] md:text-[56px] leading-none">{t("workHeadline")}</h2>
          <Eyebrow>{t("workEyebrow")}</Eyebrow>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Placeholder label="GT-R · pressure wash" src="/img/work-gtr.jpg" height={260} />
          <Placeholder label="Mustang · showroom" src="/img/work-mustang.jpg" height={260} />
          <Placeholder label="Panamera Turbo · premium" src="/img/work-panamera.jpg" height={260} />
          <Placeholder label="4Runner · full detail" src="/img/work-4runner.jpg" height={260} />
        </div>
      </section>

      {/* Wash-for-Sheen recruit band */}
      <section className="px-6 md:px-14 py-20 bg-bone border-t border-mist">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div>
            <Eyebrow className="!text-royal">{t("recruitEyebrow")}</Eyebrow>
            <h2 className="display text-[40px] md:text-[56px] leading-[0.95] mt-3">
              {t("recruitHeadlineA")}
              <br />
              <span className="text-royal">{t("recruitHeadlineB")}</span>
            </h2>
            <p className="text-sm md:text-base text-smoke mt-4 leading-relaxed max-w-md">
              {t("recruitBody")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/wash"
                className="bg-ink text-bone px-7 py-4 text-sm font-bold uppercase tracking-wide hover:bg-royal transition-colors"
              >
                {t("recruitApply")}
              </Link>
              <Link
                href="/wash#earnings"
                className="border border-ink text-ink px-7 py-4 text-sm font-bold uppercase tracking-wide hover:bg-ink hover:text-bone transition-colors"
              >
                {t("recruitMath")}
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {recruitStats.map((s) => (
              <div key={s.k} className="bg-ink text-bone p-5">
                <div className="display tabular text-3xl text-sol">{s.k}</div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-bone/70 mt-2">
                  {s.v}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="px-6 md:px-14 py-24 md:py-32 bg-ink text-bone text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-2 bg-sol" />
        <Eyebrow className="!text-sol" prefix={null}>
          {tc("ready")}
        </Eyebrow>
        <h2 className="display mt-6 mb-8 text-[64px] md:text-[112px] leading-[0.95]">
          {t("finalHeadlineA")} <span className="text-sol">{t("finalHeadlineB")}</span>
        </h2>
        <Link
          href="/app/book"
          className="inline-block bg-sol text-ink px-9 py-5 text-base font-bold uppercase tracking-wide hover:bg-bone transition-colors"
        >
          {tc("bookCta")}
        </Link>
      </section>

      <MFooter />
    </>
  );
}

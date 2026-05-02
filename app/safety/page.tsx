import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MNav } from "@/components/marketing/MNav";
import { MFooter } from "@/components/marketing/MFooter";
import { Eyebrow } from "@/components/brand/Eyebrow";

export const metadata = {
  title: "Trust & safety — Sheen",
  description:
    "Vetted pros, $1M general liability, $2,500 damage guarantee, payment held until you approve, 4 finished-work photos every time, QR check-in. The whole transaction is on rails.",
  alternates: { canonical: "/safety" },
  openGraph: {
    title: "Trust & safety — Sheen",
    description:
      "Vetted pros, $1M GL, $2,500 damage cover, payment held until you approve. The whole transaction is on rails.",
    images: [{ url: "/img/og-default.jpg", width: 1200, height: 630, alt: "Sheen — trust & safety" }],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Trust & safety — Sheen",
    description: "Vetted pros, $1M GL, $2,500 damage cover. Pay only after you approve.",
    images: ["/img/og-default.jpg"],
  },
};

const itemKeys = [
  "damage",
  "gl",
  "bg",
  "qr",
  "approve",
  "fourPhotos",
  "object",
  "track",
  "tips",
  "anon",
  "fair",
] as const;

export default async function SafetyPage() {
  const t = await getTranslations("safety");
  const headlineLines = t("headline").split("\n");
  const items = itemKeys.map((k) => ({
    h: t(`items.${k}Title` as const),
    d: t(`items.${k}Desc` as const),
  }));
  const trust = [
    { k: t("trust2500"), v: t("trust2500Label") },
    { k: t("trust1M"), v: t("trust1MLabel") },
    { k: t("trust100"), v: t("trust100Label") },
    { k: t("trustHeld"), v: t("trustHeldLabel") },
  ];
  return (
    <>
      <MNav />

      {/* Hero */}
      <section className="relative bg-ink text-bone px-6 md:px-14 pt-16 md:pt-20 pb-12">
        <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
        <Eyebrow className="!text-sol">{t("eyebrow")}</Eyebrow>
        <h1 className="display text-[48px] md:text-[88px] leading-tight mt-6 max-w-[900px]">
          {headlineLines.map((line, i) => {
            const isLast = i === headlineLines.length - 1;
            return (
              <span key={i}>
                {isLast ? <span className="text-sol">{line}</span> : line}
                {!isLast && <br />}
              </span>
            );
          })}
        </h1>
        <p className="mt-6 max-w-[600px] text-base md:text-lg leading-relaxed text-bone/80">
          {t("subhead")}
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
          <h2 className="display text-[36px] md:text-[56px] leading-none">{t("safeguardsHeadline")}</h2>
          <Eyebrow>{t("safeguardsEyebrow")}</Eyebrow>
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
          {t("closingHeadline")}
        </h2>
        <p className="text-sm text-bone/70 max-w-md mx-auto mb-7">
          {t("closingBody")}
        </p>
        <Link
          href="mailto:hello@sheen.co"
          className="inline-block bg-sol text-ink px-9 py-4 text-sm font-bold uppercase tracking-wide hover:bg-bone transition"
        >
          {t("closingCta")}
        </Link>
      </section>

      <MFooter />
    </>
  );
}

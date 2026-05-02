import { MNav } from "@/components/marketing/MNav";
import { MFooter } from "@/components/marketing/MFooter";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Help & FAQ — Sheen",
  description:
    "How Sheen works, how payments are held, what to do if something's off, and how to reach a human when the FAQ doesn't cover it.",
  alternates: { canonical: "/help" },
  openGraph: {
    title: "Help & FAQ — Sheen",
    description: "How Sheen works, payments, photos, disputes, tipping.",
    images: [{ url: "/img/og-default.jpg", width: 1200, height: 630, alt: "Sheen help" }],
  },
};

export default async function HelpPage() {
  const t = await getTranslations("help");
  const itemKeys = ["booking", "payment", "damage", "direct", "tip", "receipt", "member", "chat"] as const;
  return (
    <>
      <MNav />
      <section className="px-6 md:px-14 py-16">
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <h1 className="display text-[48px] md:text-[72px] leading-tight mt-6 mb-10">{t("headline")}</h1>
        <div className="border-t border-ink">
          {itemKeys.map((k) => (
            <div key={k} className="py-7 border-b border-mist">
              <div className="text-lg font-semibold mb-2">{t(`items.${k}Title`)}</div>
              <div className="text-sm text-smoke leading-relaxed max-w-[640px]">{t(`items.${k}Desc`)}</div>
            </div>
          ))}
        </div>
        <p className="text-sm text-smoke mt-12">
          {t("stillNeedHelpPrefix")} <a href="mailto:hello@sheen.co" className="underline">hello@sheen.co</a>{t("stillNeedHelpSuffix")}
        </p>
      </section>
      <MFooter />
    </>
  );
}

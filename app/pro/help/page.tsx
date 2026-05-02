import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { SupportForm } from "./SupportForm";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function ProHelpPage() {
  const t = await getTranslations("proHelp");

  const faq = [
    { q: t("faq1Q"), a: t("faq1A") },
    { q: t("faq2Q"), a: t("faq2A") },
    { q: t("faq3Q"), a: t("faq3A") },
    { q: t("faq4Q"), a: t("faq4A") },
    { q: t("faq5Q"), a: t("faq5A") },
    { q: t("faq6Q"), a: t("faq6A") },
    { q: t("faq7Q"), a: t("faq7A") },
    { q: t("faq8Q"), a: t("faq8A") },
  ];

  return (
    <div className="px-5 pt-10 pb-8">
      <Link href="/pro" className="text-bone/60 text-sm">
        ← {t("backLink")}
      </Link>
      <Eyebrow className="!text-bone/60 mt-4" prefix={null}>
        {t("eyebrow")}
      </Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">{t("headline")}</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-6" />

      <Eyebrow className="!text-bone/60" prefix={null}>
        {t("faqEyebrow")}
      </Eyebrow>
      <div className="mt-3 mb-8 space-y-2">
        {faq.map((f) => (
          <details key={f.q} className="bg-white/5 p-4 group">
            <summary className="text-sm font-bold cursor-pointer flex justify-between items-center">
              <span>{f.q}</span>
              <span className="text-sol ml-3 group-open:rotate-45 transition">+</span>
            </summary>
            <p className="text-xs text-bone/65 mt-3 leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>

      <Eyebrow className="!text-bone/60" prefix={null}>
        {t("contactEyebrow")}
      </Eyebrow>
      <div className="mt-3">
        <SupportForm />
      </div>
    </div>
  );
}

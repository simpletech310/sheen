"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Wordmark } from "@/components/brand/Wordmark";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { LanguagePicker } from "@/components/i18n/LanguagePicker";

export function MFooter() {
  const t = useTranslations("footer");
  const tc = useTranslations("common");

  const cols: { h: string; items: { label: string; href: string }[] }[] = [
    {
      h: t("services"),
      items: [
        { label: t("autoDetail"), href: "/auto" },
        { label: t("bigRigWash"), href: "/big-rig" },
        { label: t("homePowerWash"), href: "/home" },
        { label: t("commercial"), href: "/business" },
      ],
    },
    {
      h: t("membership"),
      items: [
        { label: t("sheenPlans"), href: "/app/membership" },
        { label: t("autoPlans"), href: "/app/membership#auto" },
        { label: t("bigRigPlans"), href: "/app/membership#big-rig" },
        { label: t("combined"), href: "/app/membership#combined" },
      ],
    },
    {
      h: t("pros"),
      items: [
        { label: t("becomeWasher"), href: "/wash" },
        { label: t("directBookings"), href: "/wash#promote" },
        { label: t("earningsCalculator"), href: "/wash#earnings" },
        { label: t("proSignIn"), href: "/sign-in?role=washer" },
      ],
    },
    {
      h: t("trust"),
      items: [
        { label: t("trustSafety"), href: "/safety" },
        { label: t("helpFaq"), href: "/help" },
        { label: t("terms"), href: "/legal/tos" },
        { label: t("privacy"), href: "/legal/privacy" },
        { label: t("contact"), href: "mailto:hello@sheen.co" },
      ],
    },
  ];
  return (
    <footer className="bg-ink text-bone px-6 md:px-14 pt-14 pb-8">
      {/* Gold horn stripe at top */}
      <div className="h-1 bg-sol -mx-6 md:-mx-14 -mt-14 mb-14" />
      <div className="max-w-screen mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-10">
          <div className="col-span-2">
            <Wordmark size={36} invert highlight />
            <p className="text-sm opacity-60 mt-5 max-w-[280px] leading-relaxed">
              {t("tagline")}
            </p>
            <Link
              href="/app/book"
              className="mt-5 inline-block bg-sol text-ink px-5 py-3 text-xs font-bold uppercase tracking-wide hover:bg-bone transition"
            >
              {tc("bookCta")}
            </Link>
            <div className="mt-5">
              <LanguagePicker variant="dark" />
            </div>
          </div>
          {cols.map((col) => (
            <div key={col.h} className="flex flex-col gap-2.5">
              <Eyebrow className="!text-sol mb-1.5" prefix={null}>
                {col.h}
              </Eyebrow>
              {col.items.map((it) => (
                <Link
                  key={it.label}
                  href={it.href}
                  className="text-sm text-bone/75 hover:text-bone transition"
                >
                  {it.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mt-12 pt-6 border-t border-bone/10 text-xs opacity-60 font-mono gap-2">
          <span>{t("copyright")}</span>
          <span className="md:text-right">{t("address")}</span>
        </div>
      </div>
    </footer>
  );
}

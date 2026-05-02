import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { CommercialLeadForm } from "./CommercialLeadForm";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function CommercialLeadPage() {
  const t = await getTranslations("appBook");

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app" className="text-smoke text-sm">
          {t("back")}
        </Link>
      </div>
      <Eyebrow>{t("commercialEyebrow")}</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">{t("commercialHeadline")}</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-5" />
      <p className="text-sm text-smoke mb-6 leading-relaxed">
        {t("commercialSubhead")}
      </p>

      <CommercialLeadForm />
    </div>
  );
}

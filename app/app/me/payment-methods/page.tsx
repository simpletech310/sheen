import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { PaymentMethodsList } from "./PaymentMethodsList";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function PaymentMethodsPage() {
  const t = await getTranslations("appPayments");
  return (
    <div className="px-5 pt-10 pb-8">
      <Link href="/app/me" className="text-sm text-smoke">{t("backLink")}</Link>
      <Eyebrow className="mt-4">{t("eyebrow")}</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">{t("heading")}</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-6" />

      <PaymentMethodsList />

      <p className="text-xs text-smoke mt-6 leading-relaxed">
        {t("saveCardNote")}
      </p>
    </div>
  );
}

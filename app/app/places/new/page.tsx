import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { PlaceForm } from "@/components/customer/PlaceForm";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function NewPlacePage() {
  const t = await getTranslations("appPlaces");
  return (
    <div className="px-5 pt-10 pb-8">
      <Link href="/app/places" className="text-sm text-smoke">← {t("back")}</Link>
      <Eyebrow className="mt-4">{t("newPlaceEyebrow")}</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-6">{t("newPlaceTitle")}</h1>
      <PlaceForm mode="new" />
    </div>
  );
}

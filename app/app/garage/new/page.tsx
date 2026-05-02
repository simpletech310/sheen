import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { VehicleForm } from "@/components/customer/VehicleForm";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function NewVehiclePage() {
  const t = await getTranslations("appGarage");
  return (
    <div className="px-5 pt-10 pb-8">
      <Link href="/app/garage" className="text-sm text-smoke">← {t("back")}</Link>
      <Eyebrow className="mt-4">{t("addVehicleEyebrow")}</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-6">{t("newVehicleTitle")}</h1>
      <VehicleForm mode="new" />
    </div>
  );
}

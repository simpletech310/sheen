import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { VehiclesPicker } from "./VehiclesPicker";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: { tier?: string; price?: string; handle?: string; category?: string };
}) {
  const t = await getTranslations("appBook");
  const category = searchParams.category === "big_rig" ? "big_rig" : "auto";
  const defaultTier = category === "big_rig" ? "Trailer Wash" : "Premium Detail";
  const defaultPrice = category === "big_rig" ? 28500 : 18500;
  const tier = searchParams.tier ?? defaultTier;
  const price = Number(searchParams.price ?? String(defaultPrice));
  const handle = searchParams.handle ?? "";

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Filter the garage to vehicles matching this booking's category. Legacy
  // rows with vehicle_type=null are treated as 'auto'.
  const requiredType = category === "big_rig" ? "big_rig" : "auto";
  const { data: vehiclesAll } = await supabase
    .from("vehicles")
    .select("id, year, make, model, color, plate, notes, is_default, vehicle_type")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false });
  const vehicles = (vehiclesAll ?? []).filter(
    (v: any) => (v.vehicle_type ?? "auto") === requiredType
  );

  const backHref =
    category === "big_rig"
      ? `/app/book/big-rig?tier=${encodeURIComponent(tier)}`
      : `/app/book/auto?tier=${encodeURIComponent(tier)}`;

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href={backHref} className="text-smoke text-sm">
          {t("back")}
        </Link>
      </div>
      <Eyebrow>
        {category === "big_rig" ? t("vehiclesStepBigRig") : t("vehiclesStepAuto")}
      </Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">
        {category === "big_rig" ? t("whichRig") : t("whichRides")}
      </h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-5" />

      <VehiclesPicker
        tier={tier}
        price={price}
        handle={handle}
        category={category}
        initialVehicles={(vehicles ?? []) as any}
      />
    </div>
  );
}

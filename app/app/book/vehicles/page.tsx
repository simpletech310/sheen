import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { VehiclesPicker } from "./VehiclesPicker";

export const dynamic = "force-dynamic";

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: { tier?: string; price?: string; handle?: string };
}) {
  const tier = searchParams.tier ?? "Premium Detail";
  const price = Number(searchParams.price ?? "18500");
  const handle = searchParams.handle ?? "";

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, year, make, model, color, plate, notes, is_default")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/app/book/auto?tier=${encodeURIComponent(tier)}`}
          className="text-smoke text-sm"
        >
          ← Back
        </Link>
      </div>
      <Eyebrow>Step 2 / 4 · Pick your vehicles</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">Which rides?</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-5" />

      <VehiclesPicker
        tier={tier}
        price={price}
        handle={handle}
        initialVehicles={(vehicles ?? []) as any}
      />
    </div>
  );
}

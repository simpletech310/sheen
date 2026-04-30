import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { createClient } from "@/lib/supabase/server";
import { VehicleRow } from "@/components/customer/VehicleRow";

export const dynamic = "force-dynamic";

export default async function GaragePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("*")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  return (
    <div className="px-5 pt-10 pb-8">
      <Eyebrow>Your garage</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">Garage</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-6" />

      <Link
        href="/app/garage/new"
        className="block w-full bg-ink text-bone py-3.5 text-center text-sm font-bold uppercase tracking-wide hover:bg-royal transition mb-6"
      >
        + Add vehicle
      </Link>

      {vehicles && vehicles.length > 0 ? (
        <div className="space-y-3">
          {vehicles.map((v: any) => (
            <VehicleRow key={v.id} vehicle={v} />
          ))}
        </div>
      ) : (
        <div className="relative overflow-hidden">
          <div
            className="aspect-[16/9] bg-cover bg-center"
            style={{ backgroundImage: "url(/img/og-default.jpg)" }}
          />
          <div className="absolute inset-0 bg-ink/55 flex flex-col items-center justify-center text-center px-6">
            <div className="font-mono text-[10px] uppercase tracking-wider text-sol mb-2">
              Empty garage
            </div>
            <h2 className="display text-xl text-bone mb-1">Add your first ride</h2>
            <p className="text-xs text-bone/80 max-w-xs">
              Save vehicles once and they pre-fill on every booking.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

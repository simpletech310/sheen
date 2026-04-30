import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { VehicleForm } from "@/components/customer/VehicleForm";

export const dynamic = "force-dynamic";

export default function NewVehiclePage() {
  return (
    <div className="px-5 pt-10 pb-8">
      <Link href="/app/garage" className="text-sm text-smoke">← Back</Link>
      <Eyebrow className="mt-4">Add a vehicle</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-6">New vehicle</h1>
      <VehicleForm mode="new" />
    </div>
  );
}

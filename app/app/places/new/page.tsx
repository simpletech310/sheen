import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { PlaceForm } from "@/components/customer/PlaceForm";

export const dynamic = "force-dynamic";

export default function NewPlacePage() {
  return (
    <div className="px-5 pt-10 pb-8">
      <Link href="/app/places" className="text-sm text-smoke">← Back</Link>
      <Eyebrow className="mt-4">Save a place</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-6">New place</h1>
      <PlaceForm mode="new" />
    </div>
  );
}

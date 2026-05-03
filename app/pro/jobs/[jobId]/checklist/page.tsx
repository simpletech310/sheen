import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { ChecklistClient, type VehicleGroup, type ChecklistItem } from "./ChecklistClient";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function JobChecklistPage({
  params,
}: {
  params: { jobId: string };
}) {
  const t = await getTranslations("proJobs");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?role=washer");

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, status, assigned_washer_id, service_id, checklist_progress, services(tier_name, category), booking_addons(addon_id, addon_name, booking_vehicle_id), booking_vehicles(id, vehicle_id, vehicles(year, make, model, color, plate))"
    )
    .eq("id", params.jobId)
    .maybeSingle();
  if (!booking) notFound();
  if (booking.assigned_washer_id !== user.id) {
    return (
      <div className="px-5 pt-10 pb-8">
        <p className="text-sm text-bone/65">{t("notAssigned")}</p>
      </div>
    );
  }

  // Pull EVERY checklist source up-front so the per-vehicle groups can
  // be assembled server-side and shipped to the client as a single
  // structure.
  const addonRows: Array<{
    addon_id: string;
    addon_name: string;
    booking_vehicle_id: string | null;
  }> = (booking as any).booking_addons ?? [];
  const bookingVehicles: Array<{
    id: string;
    vehicle_id: string;
    vehicles?: { year?: number; make?: string; model?: string; color?: string; plate?: string } | null;
  }> = (booking as any).booking_vehicles ?? [];
  const addonIds = Array.from(new Set(addonRows.map((a) => a.addon_id)));

  const [{ data: serviceItems }, { data: addonItems }] = await Promise.all([
    supabase
      .from("service_checklist_items")
      .select("id, label, hint, requires_photo, sort_order")
      .eq("service_id", booking.service_id)
      .order("sort_order"),
    addonIds.length > 0
      ? supabase
          .from("addon_checklist_items")
          .select("id, label, hint, requires_photo, sort_order, addon_id")
          .in("addon_id", addonIds)
          .order("sort_order")
      : Promise.resolve({ data: [] as any[] } as any),
  ]);

  const baseItems: ChecklistItem[] = (serviceItems ?? []).map((i: any) => ({
    id: i.id,
    label: i.label,
    hint: i.hint,
    requires_photo: i.requires_photo,
  }));

  // Group addon checklist items by addon_id so we can attach them to
  // whichever vehicle ordered the addon.
  const addonItemsByAddon = new Map<string, ChecklistItem[]>();
  for (const i of (addonItems ?? []) as any[]) {
    const list = addonItemsByAddon.get(i.addon_id) ?? [];
    list.push({
      id: i.id,
      label: i.label,
      hint: i.hint,
      requires_photo: i.requires_photo,
    });
    addonItemsByAddon.set(i.addon_id, list);
  }

  // Build the per-vehicle structure. Each vehicle gets:
  //   - the full base service checklist
  //   - one section per addon attached to THIS vehicle, with its items
  const vehicles: VehicleGroup[] = bookingVehicles.map((bv) => {
    const v = bv.vehicles ?? {};
    const label = [v.year, v.color, v.make, v.model].filter(Boolean).join(" ") || "Vehicle";
    const addonsOnThisVehicle = addonRows.filter((a) => a.booking_vehicle_id === bv.id);
    return {
      bookingVehicleId: bv.id,
      label,
      plate: v.plate ?? null,
      baseItems,
      addons: addonsOnThisVehicle.map((a) => ({
        addonId: a.addon_id,
        addonName: a.addon_name,
        items: addonItemsByAddon.get(a.addon_id) ?? [],
      })),
    };
  });

  // Legacy addons with no vehicle FK — render under a "booking-level"
  // pseudo-vehicle so they still show up. Should be empty for new bookings.
  const orphanAddons = addonRows.filter((a) => !a.booking_vehicle_id);
  if (orphanAddons.length > 0) {
    vehicles.push({
      bookingVehicleId: null,
      label: t("bookingLevelAddons"),
      plate: null,
      baseItems: [],
      addons: orphanAddons.map((a) => ({
        addonId: a.addon_id,
        addonName: a.addon_name,
        items: addonItemsByAddon.get(a.addon_id) ?? [],
      })),
    });
  }

  const progress = (booking.checklist_progress as Record<
    string,
    { done_at?: string; photo_path?: string }
  >) ?? {};

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/pro/jobs/${params.jobId}/timer`} className="text-bone/60 text-sm">
          ← {t("backToTimer")}
        </Link>
      </div>
      <Eyebrow className="!text-bone/60" prefix={null}>
        {t("checklistEyebrow")}
      </Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">
        {(booking as any).services?.tier_name?.toUpperCase() ?? t("jobFallback")}
      </h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-5" />
      <p className="text-sm text-bone/60 mb-6 leading-relaxed">
        {t("checklistInstructionsPerVehicle")}
      </p>

      <ChecklistClient
        jobId={params.jobId}
        vehicles={vehicles}
        initialProgress={progress}
      />
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";
import { TrackingClient } from "@/components/customer/TrackingClient";
import { WasherProfileCard } from "@/components/customer/WasherProfileCard";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { BookingVehicleList } from "@/components/customer/BookingVehicleList";
import { CustomerChecklist } from "@/components/customer/CustomerChecklist";
import { signedUrls } from "@/lib/storage";
import { ApprovalPanel } from "@/components/customer/ApprovalPanel";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function TrackingPage({ params }: { params: { id: string } }) {
  const t = await getTranslations("appTracking");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, status, assigned_washer_id, service_id, total_cents, customer_approved_at, funds_released_at, completed_at, work_photo_paths, checklist_progress, addresses(lat, lng), services(tier_name), booking_addons(addon_id, addon_code, addon_name, price_cents, booking_vehicle_id)"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!booking) notFound();

  // Vehicles + condition photos for this booking. Garage photos
  // (vehicles.photo_paths) and condition photos both render via
  // BookingVehicleList; they live in the same bucket so we batch-sign.
  const { data: bvRows } = await supabase
    .from("booking_vehicles")
    .select(
      "id, vehicle_id, condition_photo_paths, vehicles(year, make, model, color, plate, notes, photo_paths)"
    )
    .eq("booking_id", params.id);
  const photoPaths = (bvRows ?? []).flatMap((r: any) => [
    ...(r.condition_photo_paths ?? []),
    ...(r.vehicles?.photo_paths ?? []),
  ]);

  const workPhotoPaths = (booking as any).work_photo_paths ?? [];

  // Checklist + per-item proof photos so the customer can watch progress
  // live. Pulls BOTH the base service items AND every addon checklist
  // for whatever extras they ticked at booking — flattened into one
  // grouped list so the customer can verify each thing they paid for
  // is actually getting done.
  const trackedAddonRows: Array<{ addon_id: string; addon_name: string }> =
    ((booking as any).booking_addons ?? []).map((a: any) => ({
      addon_id: a.addon_id ?? a.id,
      addon_name: a.addon_name,
    }));
  const trackedAddonIds = trackedAddonRows
    .map((a) => a.addon_id)
    .filter((id): id is string => !!id);
  const trackedAddonNameById = new Map(
    trackedAddonRows.map((a) => [a.addon_id, a.addon_name] as const)
  );

  const [{ data: serviceChecklistItems }, { data: addonChecklistItems }] =
    await Promise.all([
      supabase
        .from("service_checklist_items")
        .select("id, label, hint, requires_photo, sort_order")
        .eq("service_id", (booking as any).service_id)
        .order("sort_order"),
      trackedAddonIds.length > 0
        ? supabase
            .from("addon_checklist_items")
            .select("id, label, hint, requires_photo, sort_order, addon_id")
            .in("addon_id", trackedAddonIds)
            .order("sort_order")
        : Promise.resolve({ data: [] as any[] } as any),
    ]);

  // Flatten with `group` per item — null = base wash, addon name otherwise.
  const checklistItems = [
    ...((serviceChecklistItems ?? []) as any[]).map((i) => ({
      id: i.id,
      label: i.label,
      hint: i.hint,
      requires_photo: i.requires_photo,
      sort_order: i.sort_order,
      group: null as string | null,
    })),
    ...((addonChecklistItems ?? []) as any[]).map((i) => ({
      id: i.id,
      label: i.label,
      hint: i.hint,
      requires_photo: i.requires_photo,
      sort_order: i.sort_order,
      group: trackedAddonNameById.get(i.addon_id) ?? "Add-on",
    })),
  ];
  const checklistProgress = ((booking as any).checklist_progress ?? {}) as Record<
    string,
    { done_at?: string; photo_path?: string | null }
  >;
  const checklistPhotoPaths = Object.values(checklistProgress)
    .map((e) => e?.photo_path)
    .filter((p): p is string => !!p);

  // Single batched signing call for vehicle, work, and checklist photos.
  const allSigned = await signedUrls("booking-photos", [
    ...photoPaths,
    ...workPhotoPaths,
    ...checklistPhotoPaths,
  ]);
  const photoUrls = Object.fromEntries(photoPaths.map((p: string) => [p, allSigned[p]]).filter(([, u]) => !!u));
  const workPhotoUrls = Object.fromEntries(
    (workPhotoPaths as string[]).map((p) => [p, allSigned[p]]).filter(([, u]) => !!u)
  );

  const addr = (booking as any).addresses;
  const customerLat = addr?.lat ? Number(addr.lat) : 34.0522;
  const customerLng = addr?.lng ? Number(addr.lng) : -118.2437;

  // Pull the assigned washer's profile + name (best-effort).
  let washerProfile: any = null;
  let washerName: string | null = null;
  if (booking.assigned_washer_id) {
    const [{ data: wp }, { data: wu }] = await Promise.all([
      supabase
        .from("washer_profiles")
        .select(
          "user_id, jobs_completed, rating_avg, bio, has_own_water, has_pressure_washer, background_check_verified"
        )
        .eq("user_id", booking.assigned_washer_id)
        .maybeSingle(),
      supabase
        .from("users")
        .select("full_name, display_name, avatar_url")
        .eq("id", booking.assigned_washer_id)
        .maybeSingle(),
    ]);
    if (wp) {
      // Prefer the public-facing display name if the pro set one. Falls
      // back to full_name. Avatar comes from the public `avatars` bucket
      // and is rendered by WasherProfileCard.
      washerName = (wu as any)?.display_name ?? wu?.full_name ?? null;
      washerProfile = {
        ...wp,
        full_name: wu?.full_name ?? null,
        display_name: (wu as any)?.display_name ?? null,
        avatar_url: (wu as any)?.avatar_url ?? null,
      };
    }
  }

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/washes" className="text-smoke text-sm">
          ← {t("backToWashes")}
        </Link>
      </div>

      <Eyebrow>{t("eyebrow", { id: booking.id.slice(0, 8) })}</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">
        {(booking as any).services?.tier_name ?? t("defaultServiceName")}
      </h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-6" />

      <TrackingClient
        bookingId={booking.id}
        initialStatus={booking.status}
        customerLat={customerLat}
        customerLng={customerLng}
        initialWasherId={booking.assigned_washer_id}
      />

      {washerProfile && (
        <div className="mt-6">
          <Eyebrow>{t("yourPro")}</Eyebrow>
          <div className="mt-2">
            <WasherProfileCard profile={washerProfile} publicLink />
          </div>
        </div>
      )}

      {(bvRows ?? []).length > 0 && (
        <div className="mt-6">
          <BookingVehicleList rows={(bvRows ?? []) as any} signedPhotoUrls={photoUrls} />
        </div>
      )}

      {(checklistItems ?? []).length > 0 && (
        <CustomerChecklist
          items={(checklistItems ?? []) as any}
          progress={checklistProgress}
          signedPhotoUrls={allSigned}
        />
      )}

      {user && booking.assigned_washer_id && (
        <ChatPanel
          bookingId={booking.id}
          currentUserId={user.id}
          otherName={washerName ?? t("yourProFallback")}
          variant="customer"
        />
      )}

      {/* Receipt — proof of what was ordered. Service tier on top,
          then every vehicle as its own block with its own add-ons
          underneath. Customer can see at a glance: Honda got wax +
          headlight restore, Dodge just the base wash. */}
      {(() => {
        const allAddons: Array<{
          addon_code: string;
          addon_name: string;
          price_cents: number;
          booking_vehicle_id: string | null;
        }> = (booking as any).booking_addons ?? [];
        const addonsByBV = new Map<string, typeof allAddons>();
        const orphanAddons: typeof allAddons = [];
        for (const a of allAddons) {
          if (a.booking_vehicle_id) {
            const list = addonsByBV.get(a.booking_vehicle_id) ?? [];
            list.push(a);
            addonsByBV.set(a.booking_vehicle_id, list);
          } else {
            orphanAddons.push(a);
          }
        }
        return (
          <div className="mt-6 bg-mist/40 p-4 text-sm">
            <div className="font-mono text-[10px] uppercase tracking-wider text-smoke mb-3">
              {t("receiptTitle")}
            </div>

            <div className="font-bold mb-3">
              {(booking as any).services?.tier_name ?? t("defaultServiceName")}
            </div>

            <div className="space-y-3">
              {(bvRows ?? []).map((r: any) => {
                const v = r.vehicles ?? {};
                const label = [v.year, v.color, v.make, v.model]
                  .filter(Boolean)
                  .join(" ");
                const vehicleAddons = addonsByBV.get(r.id) ?? [];
                return (
                  <div key={r.id} className="bg-bone/40 p-2.5">
                    <div className="text-xs font-semibold text-ink">
                      → {label || t("defaultServiceName")}
                      {v.plate ? (
                        <span className="ml-1 font-mono text-[10px] text-smoke">· {v.plate}</span>
                      ) : null}
                    </div>
                    {vehicleAddons.length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        {vehicleAddons.map((a) => (
                          <div
                            key={a.addon_code}
                            className="flex justify-between text-xs pl-3"
                          >
                            <span className="text-ink/80">+ {a.addon_name}</span>
                            <span className="tabular text-smoke">{fmtUSD(a.price_cents)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Orphan add-ons (legacy bookings pre-0036 — no vehicle FK).
                Render in a single section so historical receipts stay readable. */}
            {orphanAddons.length > 0 && (
              <div className="mt-3 space-y-1">
                <div className="font-mono text-[10px] uppercase tracking-wider text-smoke mb-1">
                  {t("addonsIncluded")}
                </div>
                {orphanAddons.map((a) => (
                  <div key={a.addon_code} className="flex justify-between text-xs">
                    <span>+ {a.addon_name}</span>
                    <span className="tabular text-smoke">{fmtUSD(a.price_cents)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-bone/30 my-3" />
            <div className="flex justify-between">
              <span className="text-smoke">{t("total")}</span>
              <span className="display tabular text-xl">{fmtUSD(booking.total_cents)}</span>
            </div>
          </div>
        );
      })()}

      {booking.status === "completed" && (
        <div className="mt-6">
          <ApprovalPanel
            bookingId={booking.id}
            approvedAt={(booking as any).customer_approved_at}
            fundsReleasedAt={(booking as any).funds_released_at}
            completedAt={(booking as any).completed_at}
            workPhotoUrls={workPhotoUrls}
          />
        </div>
      )}
    </div>
  );
}

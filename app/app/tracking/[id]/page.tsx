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
      "id, status, assigned_washer_id, service_id, total_cents, customer_approved_at, funds_released_at, completed_at, work_photo_paths, checklist_progress, addresses(lat, lng), services(tier_name)"
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
      "vehicle_id, condition_photo_paths, vehicles(year, make, model, color, plate, notes, photo_paths)"
    )
    .eq("booking_id", params.id);
  const photoPaths = (bvRows ?? []).flatMap((r: any) => [
    ...(r.condition_photo_paths ?? []),
    ...(r.vehicles?.photo_paths ?? []),
  ]);

  const workPhotoPaths = (booking as any).work_photo_paths ?? [];

  // Checklist + per-item proof photos so the customer can watch progress live.
  const { data: checklistItems } = await supabase
    .from("service_checklist_items")
    .select("id, label, hint, requires_photo, sort_order")
    .eq("service_id", (booking as any).service_id)
    .order("sort_order");
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

      <div className="mt-6 bg-mist/40 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-smoke">{t("total")}</span>
          <span className="display tabular text-xl">{fmtUSD(booking.total_cents)}</span>
        </div>
      </div>

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

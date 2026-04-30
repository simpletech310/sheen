import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";
import { DisputeButton } from "./DisputeButton";
import { CancelButton } from "./CancelButton";
import { RescheduleButton } from "./RescheduleButton";
import { RepeatButton } from "./RepeatButton";
import { BookingVehicleList } from "@/components/customer/BookingVehicleList";
import { signedUrls } from "@/lib/storage";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting pro",
  matched: "Pro matched",
  en_route: "On the way",
  arrived: "Arrived",
  in_progress: "Cleaning",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Under review",
};

export default async function WashDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, status, completed_at, scheduled_window_start, total_cents, service_cents, fees_cents, tip_cents, points_earned, vehicle_count, customer_id, service_id, address_id, recurring_template_id, services(tier_name, category), addresses(street, city, state, zip)"
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!booking) notFound();

  // The customer's own review of this wash (if they left one).
  const { data: review } = await supabase
    .from("reviews")
    .select("rating_int, comment, created_at")
    .eq("booking_id", params.id)
    .maybeSingle();

  // All vehicles attached to this booking + signed URLs for their photos.
  const { data: bvRows } = await supabase
    .from("booking_vehicles")
    .select(
      "vehicle_id, condition_photo_paths, vehicles(year, make, model, color, plate, notes)"
    )
    .eq("booking_id", params.id);
  const allPhotoPaths = (bvRows ?? []).flatMap((r: any) => r.condition_photo_paths ?? []);
  const photoUrls = await signedUrls("booking-photos", allPhotoPaths);

  const completedHours =
    booking.completed_at != null
      ? (Date.now() - new Date(booking.completed_at).getTime()) / 3_600_000
      : null;
  const canDispute = completedHours !== null && completedHours < 24 && booking.status === "completed";
  const isLive = !["completed", "cancelled", "disputed"].includes(booking.status);
  const statusLabel = STATUS_LABEL[booking.status] ?? booking.status.replace(/_/g, " ");

  const a: any = (booking as any).addresses;

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/washes" className="text-smoke text-sm">
          ← Washes
        </Link>
      </div>
      <Eyebrow>Wash · #{booking.id.slice(0, 8)}</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">{(booking as any).services?.tier_name?.toUpperCase()}</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-3" />

      <div className="flex items-center gap-2 text-sm">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            booking.status === "completed"
              ? "bg-good"
              : booking.status === "cancelled" || booking.status === "disputed"
              ? "bg-bad"
              : "bg-royal animate-pulse"
          }`}
        />
        <span className="font-mono text-[10px] uppercase tracking-wider text-smoke">{statusLabel}</span>
      </div>

      <div className="bg-mist/40 p-4 mt-4 text-sm">
        <Eyebrow>Schedule</Eyebrow>
        <div className="mt-2">
          {new Date(booking.scheduled_window_start).toLocaleDateString([], {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </div>
        <div className="text-xs text-smoke">
          {new Date(booking.scheduled_window_start).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}{" "}
          window
        </div>
      </div>

      {(bvRows ?? []).length > 0 && (
        <div className="mt-3">
          <BookingVehicleList rows={(bvRows ?? []) as any} signedPhotoUrls={photoUrls} />
        </div>
      )}

      <div className="bg-mist/40 p-4 mt-3 text-sm">
        <Eyebrow>Address</Eyebrow>
        <div className="mt-2">{a?.street}</div>
        <div className="text-xs text-smoke">
          {a?.city}, {a?.state} {a?.zip}
        </div>
      </div>

      <div className="bg-mist/40 p-5 mt-3 space-y-2.5 text-sm">
        <Eyebrow>Receipt</Eyebrow>
        <div className="flex justify-between mt-2">
          <span className="text-smoke">
            Service{booking.vehicle_count && booking.vehicle_count > 1 ? ` × ${booking.vehicle_count}` : ""}
          </span>
          <span className="tabular">{fmtUSD(booking.service_cents)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-smoke">Trust fee</span>
          <span className="tabular">{fmtUSD(booking.fees_cents)}</span>
        </div>
        {booking.tip_cents ? (
          <div className="flex justify-between">
            <span className="text-smoke">Tip · 100% to your pro</span>
            <span className="tabular">{fmtUSD(booking.tip_cents)}</span>
          </div>
        ) : null}
        <div className="flex justify-between pt-3 border-t border-mist">
          <span className="font-bold">Total</span>
          <span className="display tabular text-2xl">
            {fmtUSD((booking.total_cents ?? 0) + (booking.tip_cents ?? 0))}
          </span>
        </div>
        {booking.points_earned ? (
          <Link
            href="/app/wallet"
            className="flex justify-between items-center text-xs text-good bg-good/10 -mx-2 px-2 py-2 mt-2 hover:bg-good/15 transition"
          >
            <span>Loyalty earned</span>
            <span className="font-mono">+{booking.points_earned} pts →</span>
          </Link>
        ) : null}
      </div>

      {review && (
        <div className="bg-mist/40 p-4 mt-3">
          <Eyebrow>Your review</Eyebrow>
          <div className="text-sol text-base tracking-widest mt-2">
            {"★".repeat(review.rating_int)}
            <span className="text-mist">{"★".repeat(5 - review.rating_int)}</span>
          </div>
          {review.comment && (
            <p className="text-sm mt-2 leading-relaxed text-ink/85">{review.comment}</p>
          )}
        </div>
      )}

      {isLive && (
        <Link
          href={`/app/tracking/${booking.id}`}
          className="mt-4 block text-center bg-ink text-bone py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-royal"
        >
          Track live →
        </Link>
      )}

      {booking.status === "completed" && !review && (
        <Link
          href={`/app/rate/${booking.id}`}
          className="mt-3 block text-center bg-royal text-bone py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-ink"
        >
          Rate &amp; tip your pro →
        </Link>
      )}

      {/* Self-service before the wash starts */}
      {(["pending", "matched"] as string[]).includes(booking.status) && (
        <>
          <RescheduleButton bookingId={booking.id} />
          <CancelButton bookingId={booking.id} />
        </>
      )}

      {/* Offer recurring after a successful wash, if not already on a schedule */}
      {booking.status === "completed" && !booking.recurring_template_id && (
        <RepeatButton
          serviceId={(booking as any).service_id}
          addressId={(booking as any).address_id ?? null}
          vehicleIds={(bvRows ?? []).map((r: any) => r.vehicle_id)}
          preferredWindow="tomorrow_10_12"
        />
      )}

      {booking.recurring_template_id && (
        <Link
          href="/app/me/recurring"
          className="mt-3 block text-center bg-mist/50 text-smoke py-3 text-xs font-mono uppercase tracking-wider hover:bg-mist transition"
        >
          ↻ From your recurring schedule · manage
        </Link>
      )}

      {canDispute && <DisputeButton bookingId={booking.id} />}
    </div>
  );
}

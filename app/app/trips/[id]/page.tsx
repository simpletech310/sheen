import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";
import { DisputeButton } from "./DisputeButton";

export const dynamic = "force-dynamic";

export default async function TripDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, status, completed_at, scheduled_window_start, total_cents, service_cents, fees_cents, tip_cents, points_earned, customer_id, services(tier_name), addresses(street, city, state, zip)"
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!booking) notFound();

  const completedHours =
    booking.completed_at != null
      ? (Date.now() - new Date(booking.completed_at).getTime()) / 3_600_000
      : null;
  const canDispute = completedHours !== null && completedHours < 24 && booking.status === "completed";

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/trips" className="text-smoke text-sm">
          ← Trips
        </Link>
      </div>
      <Eyebrow>Trip · #{booking.id.slice(0, 8)}</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">{(booking as any).services?.tier_name?.toUpperCase()}</h1>
      <div className="text-xs text-smoke">
        {new Date(booking.scheduled_window_start).toLocaleString()}
      </div>

      <div className="bg-mist/40 p-5 mt-5 space-y-2.5 text-sm">
        <div className="flex justify-between">
          <span className="text-smoke">Service</span>
          <span className="tabular">{fmtUSD(booking.service_cents)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-smoke">Trust fee</span>
          <span className="tabular">{fmtUSD(booking.fees_cents)}</span>
        </div>
        {booking.tip_cents ? (
          <div className="flex justify-between">
            <span className="text-smoke">Tip</span>
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
          <div className="flex justify-between text-xs text-good">
            <span>Loyalty earned</span>
            <span>+{booking.points_earned} pts</span>
          </div>
        ) : null}
      </div>

      <div className="bg-mist/40 p-4 mt-3 text-sm">
        <Eyebrow>Address</Eyebrow>
        <div className="mt-2">{(booking as any).addresses?.street}</div>
        <div className="text-xs text-smoke">
          {(booking as any).addresses?.city}, {(booking as any).addresses?.state}{" "}
          {(booking as any).addresses?.zip}
        </div>
      </div>

      {canDispute && <DisputeButton bookingId={booking.id} />}
    </div>
  );
}

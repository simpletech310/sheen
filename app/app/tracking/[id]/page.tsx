import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";
import { TrackingClient } from "@/components/customer/TrackingClient";

export default async function TrackingPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, assigned_washer_id, total_cents, addresses(lat, lng), services(tier_name)")
    .eq("id", params.id)
    .maybeSingle();

  if (!booking) notFound();

  const addr = (booking as any).addresses;
  const customerLat = addr?.lat ? Number(addr.lat) : 34.0522;
  const customerLng = addr?.lng ? Number(addr.lng) : -118.2437;

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/trips" className="text-smoke text-sm">
          ← Trips
        </Link>
      </div>

      <Eyebrow>Booking · #{booking.id.slice(0, 8)}</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-6">
        {(booking as any).services?.tier_name ?? "Service"}
      </h1>

      <TrackingClient
        bookingId={booking.id}
        initialStatus={booking.status}
        customerLat={customerLat}
        customerLng={customerLng}
        initialWasherId={booking.assigned_washer_id}
      />

      <div className="mt-6 bg-mist/40 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-smoke">Total</span>
          <span className="display tabular text-xl">{fmtUSD(booking.total_cents)}</span>
        </div>
      </div>

      {booking.status === "completed" && (
        <Link
          href={`/app/rate/${booking.id}`}
          className="mt-6 block text-center bg-royal text-bone py-4 text-sm font-bold uppercase tracking-wide hover:bg-ink"
        >
          Rate &amp; tip →
        </Link>
      )}
    </div>
  );
}

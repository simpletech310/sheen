import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";

const statusOrder = ["pending", "matched", "en_route", "arrived", "in_progress", "completed"] as const;
const statusLabel: Record<string, string> = {
  pending: "Matching pro",
  matched: "Pro matched",
  en_route: "En route",
  arrived: "Arrived",
  in_progress: "Cleaning",
  completed: "Done",
};

export default async function TrackingPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, scheduled_window_start, scheduled_window_end, service_cents, fees_cents, total_cents, assigned_washer_id, customer_id")
    .eq("id", params.id)
    .maybeSingle();

  if (!booking) notFound();

  const idx = statusOrder.indexOf(booking.status as (typeof statusOrder)[number]);

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/trips" className="text-smoke text-sm">
          ← Trips
        </Link>
      </div>

      <div className="bg-cobalt/10 h-56 mb-5 flex items-center justify-center text-cobalt text-xs font-mono uppercase">
        ▢ Live map (Mapbox stub)
      </div>

      <Eyebrow>Booking · #{booking.id.slice(0, 8)}</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-6">{statusLabel[booking.status] ?? booking.status}</h1>

      <div className="space-y-2.5">
        {statusOrder.map((s, i) => (
          <div
            key={s}
            className={`flex items-center gap-3 p-3 ${
              i <= idx ? "bg-ink text-bone" : "bg-mist/40 text-smoke"
            }`}
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
              i < idx ? "bg-cobalt text-bone" : i === idx ? "bg-bone text-ink" : "bg-mist text-smoke"
            }`}>
              {i < idx ? "✓" : i + 1}
            </div>
            <span className="text-sm">{statusLabel[s]}</span>
            {i === idx && <span className="ml-auto font-mono text-[11px]">ACTIVE</span>}
          </div>
        ))}
      </div>

      <div className="mt-6 bg-mist/40 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-smoke">Total</span>
          <span className="display tabular text-xl">{fmtUSD(booking.total_cents)}</span>
        </div>
      </div>

      {booking.status === "completed" && (
        <Link
          href={`/app/rate/${booking.id}`}
          className="mt-6 block text-center bg-cobalt text-bone rounded-full py-4 text-sm font-semibold"
        >
          Rate &amp; tip →
        </Link>
      )}
    </div>
  );
}

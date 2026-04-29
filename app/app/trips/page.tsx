import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";

export default async function TripsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, status, total_cents, scheduled_window_start, services(tier_name)")
    .eq("customer_id", user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(50);

  const total = (bookings ?? []).reduce((acc, b: any) => acc + (b.total_cents ?? 0), 0);

  return (
    <div className="px-5 pt-10 pb-8">
      <Eyebrow>This year · {bookings?.length ?? 0} trips · {fmtUSD(total)} total</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-6">Trips</h1>

      {bookings && bookings.length > 0 ? (
        <div className="space-y-2">
          {bookings.map((b: any) => (
            <Link
              key={b.id}
              href={`/app/tracking/${b.id}`}
              className="block bg-mist/40 hover:bg-mist transition p-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm font-semibold">{b.services?.tier_name ?? "Service"}</div>
                  <div className="text-xs text-smoke mt-1">
                    {new Date(b.scheduled_window_start).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="display tabular text-lg">{fmtUSD(b.total_cents)}</div>
                  <div className="font-mono text-[10px] text-smoke uppercase">{b.status}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-mist/40 p-6 text-center text-sm text-smoke">
          No trips yet. <Link href="/app/book" className="text-ink underline">Book your first wash →</Link>
        </div>
      )}
    </div>
  );
}

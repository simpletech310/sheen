import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  completed: "bg-good",
  en_route: "bg-royal",
  arrived: "bg-royal",
  in_progress: "bg-sol",
  pending: "bg-smoke",
  cancelled: "bg-bad",
};

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
      <h1 className="display text-3xl mt-3 mb-2">Trips</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-6" />

      {bookings && bookings.length > 0 ? (
        <div className="space-y-2">
          {bookings.map((b: any) => {
            const stripe = STATUS_COLOR[b.status] ?? "bg-smoke";
            return (
              <Link
                key={b.id}
                href={b.status === "completed" ? `/app/trips/${b.id}` : `/app/tracking/${b.id}`}
                className="relative block bg-mist/40 hover:bg-mist transition p-4 pl-5 group"
              >
                <span className={`absolute left-0 top-0 bottom-0 w-1 ${stripe}`} />
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-semibold">{b.services?.tier_name ?? "Service"}</div>
                    <div className="text-xs text-smoke mt-1">
                      {new Date(b.scheduled_window_start).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="display tabular text-lg">{fmtUSD(b.total_cents)}</div>
                    <div className="font-mono text-[10px] text-smoke uppercase tracking-wider mt-0.5">
                      {b.status.replace(/_/g, " ")}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="relative overflow-hidden">
          <div
            className="aspect-[16/9] bg-cover bg-center"
            style={{ backgroundImage: "url(/img/og-default.jpg)" }}
          />
          <div className="absolute inset-0 bg-ink/55 flex flex-col items-center justify-center text-center px-6">
            <div className="font-mono text-[10px] uppercase tracking-wider text-sol mb-2">
              No trips yet
            </div>
            <h2 className="display text-xl text-bone mb-3">Book your first wash</h2>
            <Link
              href="/app/book"
              className="bg-sol text-ink px-5 py-2.5 text-xs font-bold uppercase tracking-wide hover:bg-bone transition"
            >
              Get started →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

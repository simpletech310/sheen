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
  matched: "bg-royal",
  cancelled: "bg-bad",
  disputed: "bg-bad",
};

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

export default async function WashesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, status, total_cents, scheduled_window_start, services(tier_name)")
    .eq("customer_id", user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(50);

  // Loyalty balance for the strip at the top — gives the customer
  // an at-a-glance view alongside their wash history.
  const { data: ledger } = await supabase
    .from("loyalty_ledger")
    .select("points")
    .eq("user_id", user?.id ?? "");
  const points = (ledger ?? []).reduce((acc, r: any) => acc + (r.points ?? 0), 0);

  const completedCount = (bookings ?? []).filter((b: any) => b.status === "completed").length;
  const upcomingCount = (bookings ?? []).filter((b: any) =>
    !["completed", "cancelled", "disputed"].includes(b.status)
  ).length;
  const total = (bookings ?? [])
    .filter((b: any) => b.status === "completed")
    .reduce((acc, b: any) => acc + (b.total_cents ?? 0), 0);

  return (
    <div className="px-5 pt-10 pb-8">
      <Eyebrow>{completedCount} washes · {fmtUSD(total)} spent</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">Your washes</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-5" />

      {/* Quick stats strip */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="bg-mist/40 p-3">
          <div className="font-mono text-[9px] uppercase tracking-wider text-smoke">Upcoming</div>
          <div className="display tabular text-2xl mt-1">{upcomingCount}</div>
        </div>
        <div className="bg-mist/40 p-3">
          <div className="font-mono text-[9px] uppercase tracking-wider text-smoke">Completed</div>
          <div className="display tabular text-2xl mt-1">{completedCount}</div>
        </div>
        <Link href="/app/wallet" className="bg-royal text-bone p-3 hover:bg-ink transition">
          <div className="font-mono text-[9px] uppercase tracking-wider text-sol">Loyalty</div>
          <div className="display tabular text-2xl mt-1">
            {points.toLocaleString()}<span className="text-xs ml-1 opacity-80">pts</span>
          </div>
        </Link>
      </div>

      {bookings && bookings.length > 0 ? (
        <div className="space-y-2">
          {bookings.map((b: any) => {
            const stripe = STATUS_COLOR[b.status] ?? "bg-smoke";
            const label = STATUS_LABEL[b.status] ?? b.status.replace(/_/g, " ");
            const isLive = !["completed", "cancelled", "disputed"].includes(b.status);
            return (
              <Link
                key={b.id}
                href={isLive ? `/app/tracking/${b.id}` : `/app/washes/${b.id}`}
                className="relative block bg-mist/40 hover:bg-mist transition p-4 pl-5 group"
              >
                <span className={`absolute left-0 top-0 bottom-0 w-1 ${stripe}`} />
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-semibold">{b.services?.tier_name ?? "Wash"}</div>
                    <div className="text-xs text-smoke mt-1">
                      {new Date(b.scheduled_window_start).toLocaleDateString([], {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                      {" · "}
                      {new Date(b.scheduled_window_start).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="display tabular text-lg">{fmtUSD(b.total_cents)}</div>
                    <div className="font-mono text-[10px] text-smoke uppercase tracking-wider mt-0.5">
                      {label}
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
              No washes yet
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

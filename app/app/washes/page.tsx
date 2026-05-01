import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";
import { WashesFilterClient, Booking } from "./WashesFilterClient";

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

      <WashesFilterClient
        bookings={bookings as Booking[]}
        completedCount={completedCount}
        upcomingCount={upcomingCount}
        totalSpent={total}
        points={points}
      />
    </div>
  );
}

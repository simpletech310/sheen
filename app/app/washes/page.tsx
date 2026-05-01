import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";
import { WashesFilterClient, Booking } from "./WashesFilterClient";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

type Sort = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

const SORT_COLUMNS: Record<Sort, { col: string; ascending: boolean }> = {
  date_desc: { col: "created_at", ascending: false },
  date_asc: { col: "created_at", ascending: true },
  amount_desc: { col: "total_cents", ascending: false },
  amount_asc: { col: "total_cents", ascending: true },
};

export default async function WashesPage({
  searchParams,
}: {
  searchParams: { page?: string; sort?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const page = Math.max(1, Number(searchParams.page) || 1);
  const sort: Sort = (searchParams.sort as Sort) in SORT_COLUMNS
    ? (searchParams.sort as Sort)
    : "date_desc";
  const sortCfg = SORT_COLUMNS[sort];

  const customerId = user?.id ?? "";
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Page-of-bookings + a total count in one round-trip so we can render
  // proper "Page X of Y" controls.
  const { data: bookings, count: totalRows } = await supabase
    .from("bookings")
    .select("id, status, total_cents, scheduled_window_start, services(tier_name)", { count: "exact" })
    .eq("customer_id", customerId)
    .order(sortCfg.col, { ascending: sortCfg.ascending })
    .range(from, to);

  // Lifetime stats deliberately query independently so they don't change
  // shape based on the current page or sort.
  const [{ data: lifetimeRows }, { data: ledger }] = await Promise.all([
    supabase
      .from("bookings")
      .select("status, total_cents")
      .eq("customer_id", customerId),
    supabase.from("loyalty_ledger").select("points").eq("user_id", customerId),
  ]);

  const points = (ledger ?? []).reduce((acc, r: any) => acc + (r.points ?? 0), 0);
  const lifetime = lifetimeRows ?? [];
  const completedCount = lifetime.filter((b: any) => b.status === "completed" || b.status === "funded").length;
  const upcomingCount = lifetime.filter((b: any) =>
    !["completed", "funded", "cancelled", "disputed"].includes(b.status)
  ).length;
  const total = lifetime
    .filter((b: any) => b.status === "completed" || b.status === "funded")
    .reduce((acc: number, b: any) => acc + (b.total_cents ?? 0), 0);

  const totalPages = Math.max(1, Math.ceil((totalRows ?? 0) / PAGE_SIZE));

  return (
    <div className="px-5 pt-10 pb-8">
      <Eyebrow>{completedCount} washes · {fmtUSD(total)} spent</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">Your washes</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-5" />

      <WashesFilterClient
        bookings={(bookings as unknown) as Booking[]}
        completedCount={completedCount}
        upcomingCount={upcomingCount}
        points={points}
        page={page}
        totalPages={totalPages}
        sort={sort}
      />
    </div>
  );
}

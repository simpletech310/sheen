import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";
import { FundButton } from "./FundButton";
import { FundAllButton } from "./FundAllButton";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = createServiceClient();
  let q = supabase
    .from("bookings")
    .select("id, status, total_cents, scheduled_window_start, customer_id, services(tier_name), users:customer_id(email)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (searchParams.status) q = q.eq("status", searchParams.status as any);
  const { data: bookings } = await q;

  const completedCount = (bookings ?? []).filter(b => b.status === "completed").length;

  return (
    <div>
      <Eyebrow>Admin · Bookings</Eyebrow>
      <div className="flex justify-between items-end mt-3 mb-6">
        <h1 className="display text-[40px] md:text-[56px] leading-tight">BOOKINGS</h1>
        <FundAllButton count={completedCount} />
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {["all", "pending", "matched", "in_progress", "completed", "funded", "cancelled", "disputed"].map((s) => (
          <Link
            key={s}
            href={s === "all" ? "/admin/bookings" : `/admin/bookings?status=${s}`}
            className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wide ${
              (searchParams.status ?? "all") === s ? "bg-ink text-bone" : "bg-mist text-ink"
            }`}
          >
            {s.replace(/_/g, " ")}
          </Link>
        ))}
      </div>

      <div className="bg-bone border border-mist overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mist text-left">
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">ID</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Customer</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Service</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Window</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Status</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Total</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Action</th>
            </tr>
          </thead>
          <tbody>
            {(bookings ?? []).map((b: any) => (
              <tr key={b.id} className="border-b border-mist last:border-b-0">
                <td className="px-4 py-3 text-xs font-mono">#{b.id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-xs">{b.users?.email ?? "—"}</td>
                <td className="px-4 py-3 text-xs">{b.services?.tier_name ?? "—"}</td>
                <td className="px-4 py-3 text-xs font-mono">
                  {new Date(b.scheduled_window_start).toLocaleString([], {
                    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3 text-xs">
                  <span className="px-2 py-0.5 bg-mist font-mono text-[10px] uppercase">{b.status}</span>
                </td>
                <td className="px-4 py-3 text-xs tabular display">{fmtUSD(b.total_cents)}</td>
                <td className="px-4 py-3 text-xs">
                  {b.status === "completed" && <FundButton id={b.id} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

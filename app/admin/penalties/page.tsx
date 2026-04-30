import { createServiceClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";
import { PenaltyActions } from "./PenaltyActions";

export const dynamic = "force-dynamic";

const STATUS_PILL: Record<string, string> = {
  pending: "bg-sol text-ink",
  applied: "bg-bad text-bone",
  waived: "bg-mist text-smoke",
  disputed: "bg-royal text-bone",
};

const PARTY_PILL: Record<string, string> = {
  customer: "bg-royal text-bone",
  washer: "bg-sol text-ink",
  partner: "bg-good text-bone",
};

export default async function AdminPenaltiesPage() {
  const supa = createServiceClient();
  const { data: penalties } = await supa
    .from("penalties")
    .select(
      "id, booking_id, user_id, party, reason, amount_cents, status, notes, created_at, applied_at, waived_at, users:user_id(email, full_name)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const totals = (penalties ?? []).reduce(
    (acc, p: any) => {
      if (p.status === "applied") acc.applied += p.amount_cents ?? 0;
      else if (p.status === "waived") acc.waived += p.amount_cents ?? 0;
      else acc.pending += p.amount_cents ?? 0;
      return acc;
    },
    { applied: 0, pending: 0, waived: 0 }
  );

  return (
    <div>
      <Eyebrow>Admin · Penalties</Eyebrow>
      <h1 className="display text-[40px] md:text-[56px] leading-tight mt-3 mb-2">PENALTIES</h1>
      <div className="h-[3px] w-24 bg-gradient-to-r from-royal to-sol mb-6" />

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-bad/10 border-l-2 border-bad p-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-bad">
            Applied
          </div>
          <div className="display tabular text-2xl mt-1">{fmtUSD(totals.applied)}</div>
        </div>
        <div className="bg-sol/15 border-l-2 border-sol p-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-smoke">
            Pending
          </div>
          <div className="display tabular text-2xl mt-1">{fmtUSD(totals.pending)}</div>
        </div>
        <div className="bg-mist/40 border-l-2 border-mist p-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-smoke">
            Waived
          </div>
          <div className="display tabular text-2xl mt-1">{fmtUSD(totals.waived)}</div>
        </div>
      </div>

      <div className="bg-bone border border-mist overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mist text-left">
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">When</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Party</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">User</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Reason</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Amount</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Status</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Action</th>
            </tr>
          </thead>
          <tbody>
            {(penalties ?? []).map((p: any) => (
              <tr key={p.id} className="border-b border-mist last:border-b-0 align-top">
                <td className="px-4 py-3 text-xs font-mono whitespace-nowrap">
                  {new Date(p.created_at).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="px-4 py-3 text-xs">
                  <span
                    className={`px-2 py-0.5 font-mono text-[10px] uppercase ${
                      PARTY_PILL[p.party] ?? "bg-mist text-smoke"
                    }`}
                  >
                    {p.party}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">
                  <div className="font-medium">{p.users?.full_name ?? "—"}</div>
                  <div className="text-smoke truncate max-w-[180px]">
                    {p.users?.email}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs">
                  <div className="font-mono uppercase">{p.reason}</div>
                  {p.notes && (
                    <div className="text-smoke text-[11px] mt-1 max-w-[260px] truncate">
                      {p.notes}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs font-mono tabular">
                  {fmtUSD(p.amount_cents)}
                </td>
                <td className="px-4 py-3 text-xs">
                  <span
                    className={`px-2 py-0.5 font-mono text-[10px] uppercase ${
                      STATUS_PILL[p.status] ?? "bg-mist text-smoke"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <PenaltyActions id={p.id} status={p.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(penalties ?? []).length === 0 && (
          <div className="p-6 text-center text-sm text-smoke">No penalties yet.</div>
        )}
      </div>
    </div>
  );
}

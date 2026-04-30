import { createServiceClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { ApproveButton } from "./ApproveButton";

export const dynamic = "force-dynamic";

export default async function AdminWashersPage() {
  const supabase = createServiceClient();
  const { data: washers } = await supabase
    .from("washer_profiles")
    .select("user_id, status, jobs_completed, rating_avg, stripe_account_id, insurance_doc_url, users(email, full_name)")
    .order("status", { ascending: true })
    .limit(200);

  return (
    <div>
      <Eyebrow>Admin · Washers</Eyebrow>
      <h1 className="display text-[40px] md:text-[56px] leading-tight mt-3 mb-6">WASHERS</h1>

      <div className="bg-bone border border-mist overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mist text-left">
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Email</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Status</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Jobs</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Rating</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Stripe</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Action</th>
            </tr>
          </thead>
          <tbody>
            {(washers ?? []).map((w: any) => (
              <tr key={w.user_id} className="border-b border-mist last:border-b-0">
                <td className="px-4 py-3 text-xs">{w.users?.email}</td>
                <td className="px-4 py-3 text-xs">
                  <span
                    className={`px-2 py-0.5 font-mono text-[10px] uppercase ${
                      w.status === "active"
                        ? "bg-good text-bone"
                        : w.status === "suspended"
                        ? "bg-bad text-bone"
                        : "bg-sol text-ink"
                    }`}
                  >
                    {w.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs tabular">{w.jobs_completed ?? 0}</td>
                <td className="px-4 py-3 text-xs tabular">{w.rating_avg ?? "—"}</td>
                <td className="px-4 py-3 text-xs font-mono">{w.stripe_account_id ? "✓" : "—"}</td>
                <td className="px-4 py-3">
                  <ApproveButton userId={w.user_id} status={w.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(washers ?? []).length === 0 && (
          <div className="p-6 text-center text-sm text-smoke">No washer applications.</div>
        )}
      </div>
    </div>
  );
}

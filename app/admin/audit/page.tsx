import { createServiceClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const supa = createServiceClient();
  const { data: log } = await supa
    .from("audit_log")
    .select("id, action, target_type, target_id, payload, created_at, actor_id, users:actor_id(email)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <Eyebrow>Admin · Audit log</Eyebrow>
      <h1 className="display text-[40px] md:text-[56px] leading-tight mt-3 mb-6">AUDIT LOG</h1>

      <div className="bg-bone border border-mist overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mist text-left">
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Time</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Actor</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Action</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Target</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Payload</th>
            </tr>
          </thead>
          <tbody>
            {(log ?? []).map((r: any) => (
              <tr key={r.id} className="border-b border-mist last:border-b-0">
                <td className="px-4 py-3 text-xs font-mono whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-xs">{r.users?.email ?? r.actor_id?.slice(0, 8) ?? "system"}</td>
                <td className="px-4 py-3 text-xs font-mono">{r.action}</td>
                <td className="px-4 py-3 text-xs font-mono">
                  {r.target_type ? `${r.target_type}/${r.target_id?.slice(0, 8) ?? ""}` : "—"}
                </td>
                <td className="px-4 py-3 text-xs font-mono text-smoke truncate max-w-[400px]">
                  {r.payload ? JSON.stringify(r.payload) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

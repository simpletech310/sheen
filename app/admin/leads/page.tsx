import { createServiceClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-sol text-ink",
  contacted: "bg-royal text-bone",
  quoted: "bg-royal/60 text-bone",
  won: "bg-good text-bone",
  lost: "bg-mist text-smoke",
};

export default async function AdminLeadsPage() {
  const supa = createServiceClient();
  const { data: leads } = await supa
    .from("commercial_leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <Eyebrow>Admin · Commercial leads</Eyebrow>
      <h1 className="display text-[40px] md:text-[56px] leading-tight mt-3 mb-2">LEADS</h1>
      <div className="h-[3px] w-24 bg-gradient-to-r from-royal to-sol mb-6" />

      <div className="bg-bone border border-mist overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mist text-left">
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Status</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Business</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Service</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Contact</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Frequency</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">When</th>
            </tr>
          </thead>
          <tbody>
            {(leads ?? []).map((l: any) => (
              <tr key={l.id} className="border-b border-mist last:border-b-0 align-top">
                <td className="px-4 py-3 text-xs">
                  <span
                    className={`px-2 py-0.5 font-mono text-[10px] uppercase ${
                      STATUS_COLORS[l.status] ?? "bg-mist text-smoke"
                    }`}
                  >
                    {l.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">
                  <div className="font-semibold">{l.business_name}</div>
                  {l.address && (
                    <div className="text-smoke">
                      {l.city}, {l.state} {l.zip}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  <div>{l.service_type}</div>
                  {l.square_footage && (
                    <div className="text-smoke font-mono">{l.square_footage} sq ft</div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {l.contact_name && <div>{l.contact_name}</div>}
                  {l.email && <div className="text-smoke">{l.email}</div>}
                  {l.phone && <div className="text-smoke font-mono">{l.phone}</div>}
                </td>
                <td className="px-4 py-3 text-xs">{l.frequency ?? "—"}</td>
                <td className="px-4 py-3 text-xs font-mono whitespace-nowrap">
                  {new Date(l.created_at).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(leads ?? []).length === 0 && (
          <div className="p-6 text-center text-sm text-smoke">No commercial leads yet.</div>
        )}
      </div>
    </div>
  );
}

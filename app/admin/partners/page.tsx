import { createServiceClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminPartnersPage() {
  const supabase = createServiceClient();
  const { data: partners } = await supabase
    .from("partner_profiles")
    .select("user_id, business_name, slug, status, jobs_completed, rating_avg, is_founding, stripe_account_id, users(email)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <Eyebrow>Admin · Partners</Eyebrow>
      <h1 className="display text-[40px] md:text-[56px] leading-tight mt-3 mb-6">PARTNERS</h1>

      <div className="bg-bone border border-mist overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mist text-left">
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Business</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Slug</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Status</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Jobs</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Stripe</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Profile</th>
            </tr>
          </thead>
          <tbody>
            {(partners ?? []).map((p: any) => (
              <tr key={p.user_id} className="border-b border-mist last:border-b-0">
                <td className="px-4 py-3 text-xs">
                  {p.business_name}
                  {p.is_founding && <span className="ml-2 text-[10px] text-sol font-mono">★ FOUNDING</span>}
                </td>
                <td className="px-4 py-3 text-xs font-mono">{p.slug}</td>
                <td className="px-4 py-3 text-xs">
                  <span
                    className={`px-2 py-0.5 font-mono text-[10px] uppercase ${
                      p.status === "active" ? "bg-good text-bone" : "bg-sol text-ink"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs tabular">{p.jobs_completed ?? 0}</td>
                <td className="px-4 py-3 text-xs font-mono">{p.stripe_account_id ? "✓" : "—"}</td>
                <td className="px-4 py-3 text-xs">
                  <Link href={`/p/${p.slug}`} className="text-royal underline">
                    /p/{p.slug}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

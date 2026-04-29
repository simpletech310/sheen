import { notFound } from "next/navigation";
import Link from "next/link";
import { MNav } from "@/components/marketing/MNav";
import { MFooter } from "@/components/marketing/MFooter";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { Placeholder } from "@/components/marketing/Placeholder";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: p } = await supabase
    .from("partner_profiles")
    .select("business_name, tagline")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!p) return { title: "Partner not found — Sheen" };
  return { title: `${p.business_name} — Sheen` };
}

export default async function PartnerProfilePage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: p } = await supabase
    .from("partner_profiles")
    .select("*")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!p) notFound();

  return (
    <>
      <MNav />
      <section className="px-6 md:px-14 pt-12 pb-10">
        <Eyebrow>Partner · {p.service_areas?.[0] ?? "LA"}</Eyebrow>
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6 mt-6">
          <div>
            <h1 className="display text-[48px] md:text-[80px] leading-[0.95] max-w-[800px]">{p.business_name}</h1>
            <p className="mt-4 text-lg text-smoke">{p.tagline}</p>
          </div>
          <div className="flex gap-6 items-end">
            <div>
              <div className="display tabular text-3xl">{p.rating_avg ?? "—"} ★</div>
              <div className="font-mono text-[11px] text-smoke uppercase mt-1">Rating</div>
            </div>
            <div>
              <div className="display tabular text-3xl">{p.jobs_completed?.toLocaleString() ?? 0}</div>
              <div className="font-mono text-[11px] text-smoke uppercase mt-1">Jobs</div>
            </div>
            <Link href="/app/book" className="bg-ink text-bone rounded-full px-5 py-3 text-sm font-semibold">
              Book →
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-14 pb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Placeholder label={`${p.business_name} · hero bay`} height={300} tone="ink" className="md:col-span-2 md:row-span-2 !h-[300px] md:!h-[612px]" />
          {["AMG · paint corr", "GT3 · ceramic", "R8 · interior", "911 · showroom"].map((l) => (
            <Placeholder key={l} label={l} height={300} tone="ink" />
          ))}
        </div>
      </section>

      <section className="px-6 md:px-14 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="display text-3xl mb-6">Services</h2>
          <ul className="border-t border-mist">
            {(p.capabilities ?? []).map((c: string) => (
              <li key={c} className="flex justify-between py-4 border-b border-mist">
                <span>{c}</span>
                <span className="font-mono text-[11px] text-smoke uppercase">Quoted</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-mist/30 p-6 border border-mist h-fit">
          <Eyebrow>Credentials</Eyebrow>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-smoke">$1M GL Insurance</span>
              <span>{p.insurance_doc_url ? "✓" : "Verified"}</span>
            </div>
            {p.license_number && (
              <div className="flex justify-between">
                <span className="text-smoke">License</span>
                <span className="font-mono text-xs">{p.license_number}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-smoke">Background check</span>
              <span>Checkr verified</span>
            </div>
            {p.years_in_business && (
              <div className="flex justify-between">
                <span className="text-smoke">Years in business</span>
                <span>{p.years_in_business}+</span>
              </div>
            )}
          </div>
        </div>
      </section>
      <MFooter />
    </>
  );
}

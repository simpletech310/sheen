import Link from "next/link";
import { MNav } from "@/components/marketing/MNav";
import { MFooter } from "@/components/marketing/MFooter";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Partners — Sheen" };
export const revalidate = 60;

export default async function PartnerPage() {
  const supabase = createClient();
  const { data: partners } = await supabase
    .from("partner_profiles")
    .select("slug, business_name, tagline, jobs_completed, rating_avg, capabilities, is_founding")
    .eq("status", "active")
    .order("jobs_completed", { ascending: false })
    .limit(6);

  const compare = [
    { c: "Customer service fee", solo: "10%", partner: "10%" },
    { c: "Commission on payout", solo: "22%", partner: "12%" },
    { c: "Effective platform take", solo: "~30%", partner: "~20%" },
    { c: "Stripe processing", solo: "Pass-through", partner: "Pass-through" },
    { c: ">$1k jobs", solo: "% commission", partner: "$150 flat finder's fee" },
  ];

  return (
    <>
      <MNav />
      <section className="bg-sol text-ink px-6 md:px-14 pt-16 md:pt-20 pb-14 relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-royal" />
        <Eyebrow>For established businesses</Eyebrow>
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-8 mt-7">
          <h1 className="display text-[64px] md:text-[112px] leading-[0.92] max-w-[800px]">
            PARTNER PROGRAM.
            <br />
            <span className="text-royal">12% FLAT.</span>
          </h1>
          <p className="max-w-[400px] text-base md:text-lg leading-relaxed text-ink/80">
            For shops with their own crew, insurance, and book of business. We send you overflow leads. You manage your
            own dispatch and disputes. Your brand on a public profile page.
          </p>
        </div>
      </section>

      <section className="px-6 md:px-14 py-16">
        <div className="border border-mist">
          <div className="grid grid-cols-3 text-xs md:text-sm">
            <div className="p-4 font-mono uppercase text-[11px] text-smoke bg-mist/40">Component</div>
            <div className="p-4 font-mono uppercase text-[11px] text-smoke bg-mist/40">Solo Washer</div>
            <div className="p-4 font-mono uppercase text-[11px] text-bone bg-royal">Partner</div>
            {compare.map((r, i) => (
              <div key={r.c} className="contents">
                <div className={`p-4 ${i % 2 === 0 ? "bg-bone" : "bg-mist/20"}`}>{r.c}</div>
                <div className={`p-4 ${i % 2 === 0 ? "bg-bone" : "bg-mist/20"}`}>{r.solo}</div>
                <div className={`p-4 font-bold ${i % 2 === 0 ? "bg-sol/15" : "bg-sol/25"}`}>{r.partner}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 md:px-14 py-16">
        <h2 className="display text-[40px] md:text-[56px] leading-tight mb-8">ACTIVE PARTNERS.</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(partners ?? []).map((p) => (
            <Link
              key={p.slug}
              href={`/p/${p.slug}`}
              className="bg-bone border border-mist p-6 hover:border-royal transition group"
            >
              <div className="flex items-start justify-between">
                <div className="display text-[28px] leading-tight group-hover:text-royal transition-colors">
                  {p.business_name.toUpperCase()}
                </div>
                {p.is_founding && (
                  <span className="font-mono text-[10px] text-ink bg-sol px-2 py-0.5 uppercase font-bold">
                    Founding
                  </span>
                )}
              </div>
              <p className="text-sm text-smoke mt-2">{p.tagline}</p>
              <div className="mt-5 flex justify-between items-center text-xs text-smoke">
                <span className="tabular">{p.rating_avg ?? "—"} ★</span>
                <span className="font-mono tabular">
                  {p.jobs_completed?.toLocaleString() ?? 0} JOBS
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-14 py-24 bg-ink text-bone relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
        <Eyebrow className="!text-sol" prefix={null}>How it works</Eyebrow>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-7">
          {[
            ["01", "Apply", "Upload $1M GL, license, sample jobs."],
            ["02", "48-hr review", "Ops verifies docs and sample work."],
            ["03", "Go live", "Public profile page at sheen.co/p/[slug]."],
            ["04", "Get jobs", "Overflow leads in your radius. Accept what fits."],
          ].map(([n, h, d]) => (
            <div key={n} className="border-t border-bone/30 pt-5">
              <div className="font-mono text-xs text-sol">{n}</div>
              <div className="display text-2xl mt-2">{h.toUpperCase()}</div>
              <p className="text-sm text-bone/70 mt-2">{d}</p>
            </div>
          ))}
        </div>
        <Link
          href="/partner/apply"
          className="mt-10 inline-block bg-sol text-ink px-7 py-4 text-sm font-bold uppercase tracking-wide hover:bg-bone transition-colors"
        >
          Apply now →
        </Link>
      </section>

      <MFooter />
    </>
  );
}

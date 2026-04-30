import { MNav } from "@/components/marketing/MNav";
import { MFooter } from "@/components/marketing/MFooter";
import { Eyebrow } from "@/components/brand/Eyebrow";

export const metadata = { title: "Commercial — Sheen" };

export default function BusinessPage() {
  return (
    <>
      <MNav />
      <section className="relative overflow-hidden bg-ink text-bone">
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/business.jpg" alt="" className="w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/70 to-ink/30" />
        </div>
        <div className="relative z-10 px-6 md:px-14 pt-16 md:pt-20 pb-14">
          <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
          <Eyebrow className="!text-sol">Service · Commercial</Eyebrow>
        <h1 className="display text-[56px] md:text-[104px] leading-[0.92] max-w-[900px] mt-7">
          STOREFRONTS, LOTS, FLEET.
          <br />
          <span className="text-sol">ALL QUOTED. ALL VETTED.</span>
        </h1>
        <p className="mt-8 max-w-[520px] text-base md:text-lg leading-relaxed text-bone/80">
          Commercial work is partner-routed. Site visit, custom quote in 24 hours, net-30 invoicing for verified
          businesses. Recurring contracts get a 15% discount.
        </p>
        </div>
      </section>

      <section className="px-6 md:px-14 pb-16 pt-12">
        <form
          action="/api/quote"
          method="post"
          className="bg-mist/40 p-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl border border-mist"
        >
          <div className="md:col-span-2">
            <Eyebrow prefix={null}>Request a quote</Eyebrow>
          </div>
          <input
            name="business_name"
            placeholder="Business name"
            className="px-4 py-3 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="px-4 py-3 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
          />
          <select name="property_type" className="px-4 py-3 bg-bone border border-mist text-sm">
            <option>Storefront</option>
            <option>Restaurant</option>
            <option>Office</option>
            <option>Medical</option>
            <option>Multi-family</option>
            <option>Post-construction</option>
          </select>
          <select name="frequency" className="px-4 py-3 bg-bone border border-mist text-sm">
            <option>One-time</option>
            <option>Weekly</option>
            <option>Bi-weekly</option>
            <option>Monthly</option>
          </select>
          <textarea
            name="notes"
            placeholder="Scope (sidewalk + entry, windows, awning, lot, trash, etc.)"
            rows={4}
            className="md:col-span-2 px-4 py-3 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
          />
          <button className="md:col-span-2 bg-royal text-bone px-6 py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-ink">
            Request site visit →
          </button>
        </form>
      </section>
      <MFooter />
    </>
  );
}

import { MNav } from "@/components/marketing/MNav";
import { MFooter } from "@/components/marketing/MFooter";
import { Eyebrow } from "@/components/brand/Eyebrow";

export const metadata = { title: "Commercial — Sheen" };

export default function BusinessPage() {
  return (
    <>
      <MNav />
      <section className="px-6 md:px-14 pt-16 md:pt-20 pb-14">
        <Eyebrow>Service · Commercial</Eyebrow>
        <h1 className="display text-[56px] md:text-[96px] leading-[0.92] max-w-[900px] mt-7">
          Storefronts, lots, fleet.
          <br />
          <span className="text-cobalt">All quoted, all vetted.</span>
        </h1>
        <p className="mt-8 max-w-[520px] text-base md:text-lg leading-relaxed text-smoke">
          Commercial work is partner-routed. Site visit, custom quote in 24 hours, net-30 invoicing for verified
          businesses. Recurring contracts get a 15% discount.
        </p>
      </section>

      <section className="px-6 md:px-14 pb-16">
        <form
          action="/api/quote"
          method="post"
          className="bg-mist/50 p-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl"
        >
          <div className="md:col-span-2">
            <Eyebrow prefix={null}>Request a quote</Eyebrow>
          </div>
          <input
            name="business_name"
            placeholder="Business name"
            className="px-4 py-3 bg-bone border border-mist rounded-md text-sm"
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="px-4 py-3 bg-bone border border-mist rounded-md text-sm"
          />
          <select name="property_type" className="px-4 py-3 bg-bone border border-mist rounded-md text-sm">
            <option>Storefront</option>
            <option>Restaurant</option>
            <option>Office</option>
            <option>Medical</option>
            <option>Multi-family</option>
            <option>Post-construction</option>
          </select>
          <select name="frequency" className="px-4 py-3 bg-bone border border-mist rounded-md text-sm">
            <option>One-time</option>
            <option>Weekly</option>
            <option>Bi-weekly</option>
            <option>Monthly</option>
          </select>
          <textarea
            name="notes"
            placeholder="Scope (sidewalk + entry, windows, awning, lot, trash, etc.)"
            rows={4}
            className="md:col-span-2 px-4 py-3 bg-bone border border-mist rounded-md text-sm"
          />
          <button className="md:col-span-2 bg-ink text-bone rounded-full px-6 py-3.5 text-sm font-semibold">
            Request site visit →
          </button>
        </form>
      </section>
      <MFooter />
    </>
  );
}

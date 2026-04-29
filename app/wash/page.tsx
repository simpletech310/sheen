import Link from "next/link";
import { MNav } from "@/components/marketing/MNav";
import { MFooter } from "@/components/marketing/MFooter";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { EarningsCalc } from "@/components/marketing/EarningsCalc";

export const metadata = { title: "Become a washer — Sheen" };

const split = [
  { side: "You bring", items: ["Your rig (water, power, tools)", "$1M GL insurance", "Reliable transport", "5★ standards"] },
  { side: "We bring", items: ["Customers in your radius", "Stripe payouts (same-day or instant)", "Background-check + Checkr", "Ratings + repeat-customer flow"] },
];

export default function WashPage() {
  return (
    <>
      <MNav />
      <section className="px-6 md:px-14 pt-16 md:pt-20 pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-end">
          <div>
            <Eyebrow>For washers</Eyebrow>
            <h1 className="display text-[56px] md:text-[88px] leading-[0.95] mt-7">
              Show up. Wash.
              <br />
              <span className="cobalt-strike not-italic">Get paid.</span>
            </h1>
            <p className="mt-7 max-w-[460px] text-base md:text-lg leading-relaxed text-smoke">
              22% headline commission (lower than Uber/Lyft). 18% on repeat customers. 100% of tips, instant. Same-day
              standard payout, instant payout for 1.5%. No quotas.
            </p>
            <div className="mt-8 flex gap-3">
              <Link
                href="/sign-up?role=washer"
                className="bg-ink text-bone rounded-full px-7 py-4 text-sm font-semibold"
              >
                Apply in 2 minutes →
              </Link>
            </div>
          </div>
          <EarningsCalc />
        </div>
      </section>

      <section className="px-6 md:px-14 py-16 bg-mist/40">
        <h2 className="display text-[32px] md:text-[48px] leading-tight mb-8">The split.</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {split.map((c) => (
            <div key={c.side} className="bg-bone p-7 border border-mist">
              <Eyebrow>{c.side}</Eyebrow>
              <ul className="mt-4">
                {c.items.map((i) => (
                  <li key={i} className="py-2.5 border-t border-mist text-sm flex items-center gap-3">
                    <span className="text-cobalt">▶</span>
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-14 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-center">
          <div className="lg:col-span-2">
            <Eyebrow className="!text-cobalt" prefix={null}>★ ★ ★ ★ ★</Eyebrow>
            <blockquote className="display text-[28px] md:text-[40px] leading-tight mt-5 font-semibold tracking-tight">
              &ldquo;Used to drive Uber. Now I do 22 details a week, $1,700+ net, and I&rsquo;m my own boss. Customers
              come back. Tips actually hit my account same day.&rdquo;
            </blockquote>
            <div className="mt-7 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-mist" />
              <div>
                <div className="text-sm font-semibold">Marcus J.</div>
                <div className="text-xs text-smoke">Long Beach · 412 jobs</div>
              </div>
            </div>
          </div>
          <Link
            href="/sign-up?role=washer"
            className="bg-cobalt text-bone rounded-md p-7 text-center hover:opacity-90"
          >
            <div className="display text-3xl">Apply now</div>
            <div className="text-sm opacity-80 mt-2">$1M GL required · ~2 min</div>
          </Link>
        </div>
      </section>

      <MFooter />
    </>
  );
}

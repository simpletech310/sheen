import Link from "next/link";
import { MNav } from "@/components/marketing/MNav";
import { MFooter } from "@/components/marketing/MFooter";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { EarningsCalc } from "@/components/marketing/EarningsCalc";
import { Placeholder } from "@/components/marketing/Placeholder";

export const metadata = { title: "Become a washer — Sheen" };

const split = [
  { side: "You bring", items: ["Your rig (water, power, tools)", "$1M GL insurance", "Reliable transport", "5★ standards"] },
  { side: "We bring", items: ["Customers in your radius", "Stripe payouts (same-day or instant)", "Background-check + Checkr", "Ratings + repeat-customer flow"] },
];

export default function WashPage() {
  return (
    <>
      <MNav />
      <section className="relative overflow-hidden bg-ink text-bone">
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/washer.jpg" alt="" className="w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-transparent" />
        </div>
        <div className="relative z-10 px-6 md:px-14 pt-16 md:pt-20 pb-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-end">
            <div>
              <Eyebrow className="!text-sol">For washers</Eyebrow>
              <h1 className="display text-[64px] md:text-[104px] leading-[0.92] mt-7">
                SHOW UP.
                <br />
                WASH.
                <br />
                <span className="text-sol">GET PAID.</span>
              </h1>
              <p className="mt-7 max-w-[460px] text-base md:text-lg leading-relaxed text-bone/75">
                22% headline commission (lower than Uber/Lyft). 18% on repeat customers. 100% of tips, instant. Same-day
                standard payout, instant payout for 1.5%. No quotas.
              </p>
              <div className="mt-8 flex gap-3">
                <Link
                  href="/sign-up?role=washer"
                  className="bg-sol text-ink px-7 py-4 text-sm font-bold uppercase tracking-wide hover:bg-bone transition-colors"
                >
                  Apply in 2 minutes →
                </Link>
              </div>
            </div>
            <EarningsCalc />
          </div>
        </div>
      </section>

      <section className="px-6 md:px-14 py-16 bg-mist/40">
        <h2 className="display text-[40px] md:text-[56px] leading-tight mb-8">THE SPLIT.</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {split.map((c) => (
            <div key={c.side} className="bg-bone p-7 border border-mist">
              <Eyebrow>{c.side}</Eyebrow>
              <ul className="mt-4">
                {c.items.map((i) => (
                  <li key={i} className="py-2.5 border-t border-mist text-sm flex items-center gap-3">
                    <span className="text-royal">▶</span>
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
          <Placeholder label="Pro at work" src="/img/washer.jpg" height={400} />
          <div className="lg:col-span-2">
            <Eyebrow className="!text-royal" prefix={null}>★ ★ ★ ★ ★</Eyebrow>
            <blockquote className="text-[28px] md:text-[40px] leading-tight mt-5 font-bold tracking-tight">
              &ldquo;Used to drive Uber. Now I do 22 details a week, $1,700+ net, and I&rsquo;m my own boss. Customers
              come back. Tips actually hit my account same day.&rdquo;
            </blockquote>
            <div className="mt-7 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-royal text-bone flex items-center justify-center font-bold">M</div>
              <div>
                <div className="text-sm font-bold">Marcus J.</div>
                <div className="text-xs text-smoke">Long Beach · 412 jobs</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-royal text-bone px-6 md:px-14 py-20 text-center relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
        <h2 className="display text-[44px] md:text-[72px] leading-tight">JOIN THE FLEET.</h2>
        <p className="mt-4 max-w-md mx-auto opacity-80 text-sm">
          $1M GL required. Background check via Checkr. Onboarding in ~2 minutes.
        </p>
        <Link
          href="/sign-up?role=washer"
          className="mt-8 inline-block bg-sol text-ink px-9 py-5 text-base font-bold uppercase tracking-wide hover:bg-bone transition-colors"
        >
          Apply now →
        </Link>
      </section>

      <MFooter />
    </>
  );
}

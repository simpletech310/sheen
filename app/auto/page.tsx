import Link from "next/link";
import { MNav } from "@/components/marketing/MNav";
import { MFooter } from "@/components/marketing/MFooter";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { Placeholder } from "@/components/marketing/Placeholder";

const tiers = [
  { tag: "01", name: "Express Wash", price: "$35", time: "30 min", items: ["Hand wash", "Tire shine", "Windows", "Door jambs"] },
  { tag: "02", name: "Full Detail", price: "$85", time: "75 min", items: ["Everything in Express", "Interior vacuum", "Dash + console wipe", "Floor mats"] },
  { tag: "03", name: "Premium Detail", price: "$185", time: "2.5 hr", items: ["Everything in Full", "Clay bar treatment", "Hand wax", "Leather conditioning"], featured: true },
  { tag: "04", name: "Showroom", price: "$450", time: "5 hr", items: ["Everything in Premium", "Paint correction", "Ceramic top-up", "Engine bay detail"] },
];

const gallery: [string, string][] = [
  ["G63 · paint correction", "Beverly Hills"],
  ["Taycan · ceramic top", "Pasadena"],
  ["F-150 · full detail", "Long Beach"],
  ["M3 · showroom", "Compton"],
];

const faq: [string, string][] = [
  ["Do you bring water and power?", "Yes. Every Sheen pro carries a self-contained rig — water tank, power, eco-friendly soaps. No hose hookup needed."],
  ["What if it rains?", "Reschedule free up to one hour before. We monitor radar and reach out first if it looks bad."],
  ["Are my products safe?", "Ceramic-safe wax, pH-balanced shampoo, microfiber per panel. We won't touch your paint with anything we wouldn't use on our own."],
  ["How does the damage guarantee work?", "Every wash is covered up to $2,500. File from the app within 24 hours of completion."],
  ["Do tips go to the pro?", "100%, no platform cut. Default prompts at 18 / 22 / 25%, custom amounts allowed."],
];

export const metadata = { title: "Auto detail — Sheen" };

export default function AutoPage() {
  return (
    <>
      <MNav />

      <section className="px-6 md:px-14 pt-16 md:pt-20 pb-14">
        <Eyebrow>Service · Auto</Eyebrow>
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-8 mt-7">
          <h1 className="display text-[56px] md:text-[96px] leading-[0.92] max-w-[800px]">
            Four tiers.
            <br />
            Two-bucket
            <br />
            method.
            <br />
            <span className="text-cobalt">Always.</span>
          </h1>
          <p className="max-w-[360px] text-base md:text-lg leading-relaxed text-smoke">
            Foam pre-soak. Microfiber per panel. Ceramic-safe wax. Every wash, every pro. We don&rsquo;t cut corners —
            we round them.
          </p>
        </div>
      </section>

      <section className="px-6 md:px-14 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border border-mist">
          {tiers.map((tier, i) => (
            <div
              key={tier.tag}
              className={`p-7 min-h-[460px] flex flex-col justify-between ${
                i < tiers.length - 1 ? "lg:border-r border-b lg:border-b-0 border-mist" : ""
              } ${tier.featured ? "bg-ink text-bone" : "bg-bone text-ink"}`}
            >
              <div>
                <div className="flex justify-between mb-8">
                  <span className="font-mono text-[11px] opacity-60">{tier.tag} / 04</span>
                  {tier.featured && (
                    <span className="font-mono text-[10px] text-wax px-2 py-1 border border-wax rounded-full">
                      POPULAR
                    </span>
                  )}
                </div>
                <div className="display text-[28px] leading-tight mb-1">{tier.name}</div>
                <div className="font-mono text-xs tabular opacity-60">{tier.time.toUpperCase()}</div>
              </div>
              <div className="my-8 flex-1">
                {tier.items.map((it) => (
                  <div
                    key={it}
                    className={`text-sm py-2.5 border-t opacity-85 ${
                      tier.featured ? "border-bone/10" : "border-mist"
                    }`}
                  >
                    {it}
                  </div>
                ))}
              </div>
              <div>
                <div className="display tabular text-[44px] leading-none mb-4">{tier.price}</div>
                <Link
                  href={`/app/book/auto?tier=${encodeURIComponent(tier.name)}`}
                  className={`block w-full text-center py-3.5 rounded-full text-sm font-semibold ${
                    tier.featured ? "bg-bone text-ink" : "bg-ink text-bone"
                  }`}
                >
                  Book {tier.name} →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-14 py-20 bg-mist/40">
        <div className="flex justify-between items-end mb-10">
          <h2 className="display text-[40px] md:text-[56px] leading-none">The work.</h2>
          <Eyebrow>Recent jobs · LA</Eyebrow>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {gallery.map(([l, loc]) => (
            <div key={l}>
              <Placeholder label={l} height={220} tone="ink" />
              <div className="flex justify-between mt-2.5">
                <span className="text-xs font-medium">{l}</span>
                <span className="font-mono text-[11px] text-smoke">{loc.toUpperCase()}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-14 py-24">
        <h2 className="display text-[40px] md:text-[56px] leading-none mb-12">Questions, answered.</h2>
        <div>
          {faq.map(([q, a], i) => (
            <div
              key={q}
              className={`grid grid-cols-[40px_1fr] md:grid-cols-[60px_1fr_1.4fr_40px] gap-4 md:gap-8 py-7 border-b border-mist items-start ${
                i === 0 ? "border-t border-ink" : ""
              }`}
            >
              <span className="font-mono text-[11px] text-smoke mt-1">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-base md:text-lg font-semibold">{q}</span>
              <span className="col-span-2 md:col-span-1 text-sm text-smoke leading-relaxed">{a}</span>
              <span className="hidden md:block text-lg text-smoke justify-self-end">+</span>
            </div>
          ))}
        </div>
      </section>

      <MFooter />
    </>
  );
}

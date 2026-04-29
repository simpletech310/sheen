import { MNav } from "@/components/marketing/MNav";
import { MFooter } from "@/components/marketing/MFooter";
import { Eyebrow } from "@/components/brand/Eyebrow";

export const metadata = { title: "Trust & Safety — Sheen" };

const items = [
  ["$2,500 damage guarantee", "Every wash is covered. File within 24 hours from the app, paid out from a platform-funded reserve."],
  ["$1M GL insurance", "Required from every washer at onboarding, doc verified by ops, re-checked at expiry."],
  ["Background checks", "Checkr verified at onboarding. Two-strike auto-suspension at ≤2★ ratings within a 30-day window."],
  ["QR check-in / out", "Customer scans pro at start, paper-trail timestamps both events for any disputes."],
  ["Live arrival tracking", "Driver photo + license plate on assignment. Standard rideshare playbook."],
  ["Tipping floor", "Pros can't see your tip until you submit a rating. Avoids retaliation."],
];

export default function SafetyPage() {
  return (
    <>
      <MNav />
      <section className="px-6 md:px-14 py-16">
        <Eyebrow>Trust &amp; safety</Eyebrow>
        <h1 className="display text-[48px] md:text-[72px] leading-tight mt-6 mb-10 max-w-[800px]">
          Vetted pros. Insured work. <span className="text-cobalt">No surprises.</span>
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map(([h, d]) => (
            <div key={h} className="bg-mist/40 p-7">
              <div className="text-lg font-semibold mb-3">{h}</div>
              <p className="text-sm text-smoke leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>
      <MFooter />
    </>
  );
}

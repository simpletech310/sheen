import { MNav } from "@/components/marketing/MNav";
import { MFooter } from "@/components/marketing/MFooter";
import { Eyebrow } from "@/components/brand/Eyebrow";

export const metadata = { title: "Help — Sheen" };

const items = [
  ["Booking & cancellation", "Free reschedule up to 1 hour before window. Cancel anytime — refunded to original payment if pro hasn't started."],
  ["Damage claims", "Open the wash in the Washes tab and tap “Report damage” within 24 hours of completion. Up to $2,500 covered automatically."],
  ["Tipping", "Default 18 / 22 / 25%, custom amounts allowed. 100% goes to your pro, no platform cut."],
  ["Receipts", "Emailed at job completion. View any time from the Washes tab."],
];

export default function HelpPage() {
  return (
    <>
      <MNav />
      <section className="px-6 md:px-14 py-16">
        <Eyebrow>Help</Eyebrow>
        <h1 className="display text-[48px] md:text-[72px] leading-tight mt-6 mb-10">How can we help?</h1>
        <div className="border-t border-ink">
          {items.map(([h, d]) => (
            <div key={h} className="py-7 border-b border-mist">
              <div className="text-lg font-semibold mb-2">{h}</div>
              <div className="text-sm text-smoke leading-relaxed max-w-[640px]">{d}</div>
            </div>
          ))}
        </div>
        <p className="text-sm text-smoke mt-12">
          Still need help? Email <a href="mailto:hello@sheen.co" className="underline">hello@sheen.co</a>.
        </p>
      </section>
      <MFooter />
    </>
  );
}

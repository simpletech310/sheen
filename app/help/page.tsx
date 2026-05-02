import { MNav } from "@/components/marketing/MNav";
import { MFooter } from "@/components/marketing/MFooter";
import { Eyebrow } from "@/components/brand/Eyebrow";

export const metadata = {
  title: "Help & FAQ — Sheen",
  description:
    "How Sheen works, how payments are held, what to do if something's off, and how to reach a human when the FAQ doesn't cover it.",
  alternates: { canonical: "/help" },
  openGraph: {
    title: "Help & FAQ — Sheen",
    description: "How Sheen works, payments, photos, disputes, tipping.",
    images: [{ url: "/img/og-default.jpg", width: 1200, height: 630, alt: "Sheen help" }],
  },
};

const items = [
  ["Booking & cancellation", "Free reschedule up to 1 hour before your window. Cancel anytime — refunded to your original payment if your pro hasn't started yet. ASAP / Rush bookings get a guaranteed pro within 60 minutes."],
  ["When am I charged?", "Your card is held at booking but only charged after you Approve the wash. Your pro uploads 4 finished-work photos at completion; tap Approve to release the funds, or file an objection with photo/video evidence if something's off."],
  ["Damage claims", "Open the wash in the Washes tab and tap “Something's wrong” within 24 hours of completion. Attach photos or a video. Up to $2,500 covered automatically — paid from a platform reserve, not the pro's pocket."],
  ["Requesting a specific pro", "Type a pro's @handle (or use their share link) at booking. The wash is sent ONLY to them for 10 minutes — no other pro can take it. If they pass it falls to the open queue so you're still covered."],
  ["Tipping", "Default 18 / 22 / 25%, custom amounts allowed. 100% goes to your pro, no platform cut. Tip after you rate — pros don't see the amount until they've been reviewed."],
  ["Receipts", "Emailed at job completion. View any time from the Washes tab — every line shows service + trust fee + tip + total."],
  ["Membership (Sheen+)", "Monthly plan that bundles Express or Full Detail washes at a lower per-wash price plus 2× loyalty points. Cancel any time, no contracts."],
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

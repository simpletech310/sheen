import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { Eyebrow } from "@/components/brand/Eyebrow";

type Item = { label: string; href: string };

// Footer is now a real navigation surface — every label has a working
// destination, and Big Rig + Sheen+ get top-level visibility.
const cols: { h: string; items: Item[] }[] = [
  {
    h: "Services",
    items: [
      { label: "Auto detail", href: "/auto" },
      { label: "Big rig wash", href: "/big-rig" },
      { label: "Home power-wash", href: "/home" },
      { label: "Commercial", href: "/business" },
    ],
  },
  {
    h: "Membership",
    items: [
      { label: "Sheen+ plans", href: "/app/membership" },
      { label: "Auto plans", href: "/app/membership#auto" },
      { label: "Big-rig plans", href: "/app/membership#big-rig" },
      { label: "Combined", href: "/app/membership#combined" },
    ],
  },
  {
    h: "Pros",
    items: [
      { label: "Wash for Sheen", href: "/wash" },
      { label: "How direct bookings work", href: "/wash#promote" },
      { label: "Earnings calculator", href: "/wash#earnings" },
      { label: "Pro sign-in", href: "/sign-in?role=washer" },
    ],
  },
  {
    h: "Trust",
    items: [
      { label: "Trust & safety", href: "/safety" },
      { label: "Help & FAQ", href: "/help" },
      { label: "Terms", href: "/legal/tos" },
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Contact", href: "mailto:hello@sheen.co" },
    ],
  },
];

export function MFooter() {
  return (
    <footer className="bg-ink text-bone px-6 md:px-14 pt-14 pb-8">
      {/* Gold horn stripe at top */}
      <div className="h-1 bg-sol -mx-6 md:-mx-14 -mt-14 mb-14" />
      <div className="max-w-screen mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-10">
          <div className="col-span-2">
            <Wordmark size={36} invert highlight />
            <p className="text-sm opacity-60 mt-5 max-w-[280px] leading-relaxed">
              On-demand wash &amp; detail in LA. Vetted pros. Pay only
              after you approve the work. Auto, home, big rig — get it
              sheened.
            </p>
            <Link
              href="/app/book"
              className="mt-5 inline-block bg-sol text-ink px-5 py-3 text-xs font-bold uppercase tracking-wide hover:bg-bone transition"
            >
              Book a wash →
            </Link>
          </div>
          {cols.map((col) => (
            <div key={col.h} className="flex flex-col gap-2.5">
              <Eyebrow className="!text-sol mb-1.5" prefix={null}>
                {col.h}
              </Eyebrow>
              {col.items.map((it) => (
                <Link
                  key={it.label}
                  href={it.href}
                  className="text-sm text-bone/75 hover:text-bone transition"
                >
                  {it.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mt-12 pt-6 border-t border-bone/10 text-xs opacity-60 font-mono gap-2">
          <span>© 2026 SHEEN INC. ALL RIGHTS RESERVED.</span>
          <span className="md:text-right">
            sheen.co · Los Angeles · made for what shines
          </span>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";

// Marketing primary nav. We keep it flat — five service entries on
// desktop. The "Big Rig" link is new and sits with the other service
// categories for visibility. Sheen+ membership has its own slot since
// it's a cross-cutting upsell.
const links = [
  { href: "/auto", label: "Auto" },
  { href: "/big-rig", label: "Big Rig" },
  { href: "/home", label: "Home" },
  { href: "/business", label: "Business" },
  { href: "/wash", label: "Become a washer" },
];

export function MNav() {
  return (
    <header className="border-b border-mist bg-bone relative z-20">
      <nav className="max-w-screen mx-auto flex items-center justify-between px-6 md:px-14 py-5">
        <Link href="/" className="shrink-0">
          <Wordmark size={26} />
        </Link>
        <div className="hidden lg:flex gap-7">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-ink/85 hover:text-royal font-medium uppercase tracking-wide transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/app/membership"
            className="text-sm text-royal hover:text-ink font-bold uppercase tracking-wide transition-colors"
          >
            Sheen+
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in?role=washer"
            className="text-xs text-royal hover:text-ink hidden md:inline uppercase font-bold"
          >
            Pro sign-in
          </Link>
          <Link
            href="/sign-in"
            className="text-xs text-ink/85 hover:text-ink hidden sm:inline uppercase font-bold"
          >
            Sign in
          </Link>
          <Link
            href="/app/book"
            className="bg-ink text-bone px-5 py-3 text-sm font-bold uppercase tracking-wide hover:bg-royal transition-colors"
          >
            Book a wash
          </Link>
        </div>
      </nav>
    </header>
  );
}

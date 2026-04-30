import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";

const links = [
  { href: "/auto", label: "Auto" },
  { href: "/home", label: "Home" },
  { href: "/business", label: "Business" },
  { href: "/wash", label: "Become a washer" },
  { href: "/partner", label: "Partners" },
];

export function MNav() {
  return (
    <header className="border-b border-mist bg-bone relative z-20">
      <nav className="max-w-screen mx-auto flex items-center justify-between px-6 md:px-14 py-5">
        <Link href="/" className="shrink-0">
          <Wordmark size={26} />
        </Link>
        <div className="hidden lg:flex gap-8">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-ink/85 hover:text-royal font-medium uppercase tracking-wide transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in?role=washer"
            className="text-xs text-royal hover:text-ink hidden sm:inline uppercase font-bold"
          >
            Pro sign-in
          </Link>
          <Link href="/sign-in" className="text-xs text-ink/85 hover:text-ink hidden sm:inline uppercase font-bold">
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

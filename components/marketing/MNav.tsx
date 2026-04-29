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
    <header className="border-b border-mist bg-bone">
      <nav className="max-w-screen mx-auto flex items-center justify-between px-6 md:px-14 py-5">
        <Link href="/" className="shrink-0">
          <Wordmark size={20} />
        </Link>
        <div className="hidden lg:flex gap-8">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-ink/85 hover:text-ink font-medium">
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="text-xs text-ink/85 hover:text-ink hidden sm:inline">
            Sign in
          </Link>
          <Link
            href="/app/book"
            className="bg-ink text-bone rounded-full px-4 py-2.5 text-sm font-semibold hover:opacity-90"
          >
            Book a wash
          </Link>
        </div>
      </nav>
    </header>
  );
}

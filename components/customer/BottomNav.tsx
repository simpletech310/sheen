"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

type IconProps = { active: boolean };

function BookIcon({ active }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="26"
      height="26"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* Plus inside soft square — the universal "create / book" mark */}
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
      <path d="M12 8v8M8 12h8" />
      {active && <rect x="6" y="6" width="12" height="12" rx="0.5" fill="currentColor" opacity="0.08" />}
    </svg>
  );
}

function WashesIcon({ active }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="26"
      height="26"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* Side-profile car — visually anchored to "wash" */}
      <path d="M3 14l1.6-3.8A2 2 0 016.4 9h11.2a2 2 0 011.8 1.2L21 14v3a1 1 0 01-1 1h-1.5a1.5 1.5 0 11-3 0H8.5a1.5 1.5 0 11-3 0H4a1 1 0 01-1-1v-3z" />
      <path d="M5 14h14" />
      <circle cx="7" cy="17.5" r="1.4" fill={active ? "currentColor" : "none"} />
      <circle cx="17" cy="17.5" r="1.4" fill={active ? "currentColor" : "none"} />
    </svg>
  );
}

function WalletIcon({ active }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="26"
      height="26"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* Wallet with card slot */}
      <path d="M3.5 7.5A2 2 0 015.5 5.5h11a2 2 0 012 2V8H6.5a1 1 0 100 2H20.5v6a2 2 0 01-2 2h-13a2 2 0 01-2-2V7.5z" />
      <circle cx="17" cy="13" r="1.1" fill={active ? "currentColor" : "none"} />
    </svg>
  );
}

function MeIcon({ active }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="26"
      height="26"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* Person silhouette */}
      <circle cx="12" cy="8.5" r="3.5" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.1 : 0} />
      <path d="M5 20a7 7 0 0114 0" />
    </svg>
  );
}

const tabs = [
  { href: "/app", label: "Book", icon: BookIcon },
  { href: "/app/washes", label: "Washes", icon: WashesIcon },
  { href: "/app/wallet", label: "Wallet", icon: WalletIcon },
  { href: "/app/me", label: "Me", icon: MeIcon },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="sticky bottom-0 left-0 right-0 z-30 border-t border-mist bg-bone/95 backdrop-blur supports-[backdrop-filter]:bg-bone/85"
      aria-label="Primary"
    >
      <div className="max-w-md mx-auto grid grid-cols-4">
        {tabs.map((t) => {
          const active =
            pathname === t.href ||
            (t.href !== "/app" && pathname?.startsWith(t.href)) ||
            (t.href === "/app" && pathname === "/app");
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                // Bigger tap target — min 64px tall + safe-area aware. The
                // pb-3 plus the env(safe-area-inset-bottom) cushion below
                // keeps the icons off the iPhone home indicator.
                "relative flex flex-col items-center justify-center min-h-[64px] pt-3.5 pb-3 text-[12px] tracking-wide transition active:bg-mist/40",
                active ? "text-ink" : "text-smoke hover:text-ink"
              )}
            >
              {/* Active accent — Royal/Sol gradient under the icon */}
              <span
                className={cn(
                  "absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-8 transition-opacity",
                  active
                    ? "opacity-100 bg-gradient-to-r from-royal to-sol"
                    : "opacity-0"
                )}
                aria-hidden
              />
              <Icon active={active} />
              <span className={cn("mt-1 font-medium", active && "font-semibold")}>
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Safe-area cushion for iOS home indicator (always min 8px so the
          PWA standalone view still has breathing room when the inset is 0). */}
      <div
        className="bg-bone/95"
        style={{ height: "max(8px, env(safe-area-inset-bottom))" }}
        aria-hidden
      />
    </nav>
  );
}

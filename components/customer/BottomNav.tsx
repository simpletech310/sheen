"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/app", label: "Book", icon: "▢" },
  { href: "/app/washes", label: "Washes", icon: "≡" },
  { href: "/app/wallet", label: "Wallet", icon: "$" },
  { href: "/app/me", label: "Me", icon: "○" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 left-0 right-0 z-30 border-t border-mist bg-bone">
      <div className="max-w-md mx-auto grid grid-cols-4">
        {tabs.map((t) => {
          const active = pathname === t.href || (t.href === "/app" && pathname === "/app");
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex flex-col items-center py-3 text-xs",
                active ? "text-ink" : "text-smoke"
              )}
            >
              <span className="text-base mb-0.5" aria-hidden>
                {t.icon}
              </span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

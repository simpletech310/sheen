"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/pro/queue", label: "Queue" },
  { href: "/pro/availability", label: "Hours" },
  { href: "/pro/wallet", label: "Wallet" },
  { href: "/pro/me", label: "Me" },
];

export function ProBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-ink">
      <div className="max-w-md mx-auto grid grid-cols-4">
        {tabs.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex flex-col items-center py-3 text-xs",
                active ? "text-bone" : "text-bone/50"
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

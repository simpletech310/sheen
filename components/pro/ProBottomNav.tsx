"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUnreadProMessages } from "@/lib/hooks/useUnreadProMessages";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/pro", label: "Home", exact: true },
  { href: "/pro/queue", label: "Queue" },
  { href: "/pro/availability", label: "Schedule" },
  { href: "/pro/messages", label: "Inbox", inbox: true },
  { href: "/pro/me", label: "Me" },
];

export function ProBottomNav() {
  const pathname = usePathname();
  const unread = useUnreadProMessages();

  return (
    <nav className="sticky bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-ink">
      <div className="max-w-md mx-auto grid grid-cols-5">
        {tabs.map((t) => {
          // Home tab matches /pro exactly so it doesn't light up everywhere.
          const active = t.exact
            ? pathname === t.href
            : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "relative flex flex-col items-center py-3 text-[11px]",
                active ? "text-bone" : "text-bone/50"
              )}
            >
              {t.label}
              {t.inbox && unread > 0 && (
                <span
                  className="absolute top-2 right-1/2 translate-x-[14px] inline-block w-2 h-2 rounded-full bg-sol"
                  aria-label={`${unread} unread`}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

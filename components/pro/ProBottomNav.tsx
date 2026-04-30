"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUnreadProMessages } from "@/lib/hooks/useUnreadProMessages";
import { cn } from "@/lib/cn";

type IconProps = { active: boolean };

function HomeIcon({ active }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* Pitched-roof house */}
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V9.5" />
      {active && <path d="M10 15h4v6h-4z" fill="currentColor" opacity="0.12" />}
    </svg>
  );
}

function QueueIcon({ active }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* Stack of jobs — 3 rows */}
      <rect x="3.5" y="5" width="17" height="3.6" rx="0.6" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.18 : 0} />
      <rect x="3.5" y="10.2" width="17" height="3.6" rx="0.6" />
      <rect x="3.5" y="15.4" width="17" height="3.6" rx="0.6" />
      <circle cx="6.5" cy="6.8" r="0.6" fill="currentColor" />
      <circle cx="6.5" cy="12" r="0.6" fill="currentColor" />
      <circle cx="6.5" cy="17.2" r="0.6" fill="currentColor" />
    </svg>
  );
}

function CalendarIcon({ active }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3.5v3M16 3.5v3" />
      {active && (
        <rect x="6" y="11.5" width="3" height="3" rx="0.4" fill="currentColor" opacity="0.7" />
      )}
    </svg>
  );
}

function InboxIcon({ active }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* Speech bubble */}
      <path d="M5 5h14a2 2 0 012 2v8a2 2 0 01-2 2h-7l-4 3.5V17H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
      {active && (
        <path d="M7.5 9h9M7.5 12h6" strokeOpacity="0.7" />
      )}
    </svg>
  );
}

function MeIcon({ active }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle
        cx="12"
        cy="8.5"
        r="3.5"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.12 : 0}
      />
      <path d="M5 20a7 7 0 0114 0" />
    </svg>
  );
}

const tabs = [
  { href: "/pro", label: "Home", icon: HomeIcon, exact: true },
  { href: "/pro/queue", label: "Queue", icon: QueueIcon },
  { href: "/pro/availability", label: "Hours", icon: CalendarIcon },
  { href: "/pro/messages", label: "Inbox", icon: InboxIcon, inbox: true },
  { href: "/pro/me", label: "Me", icon: MeIcon },
];

export function ProBottomNav() {
  const pathname = usePathname();
  const unread = useUnreadProMessages();

  return (
    <nav
      // Same sticky + backdrop-blur treatment the customer nav uses, just
      // dark-themed. Sol-gold accent under the active tab matches the
      // royal-to-sol gradient on the customer side.
      className="sticky bottom-0 left-0 right-0 z-30 border-t border-bone/10 bg-ink/95 backdrop-blur supports-[backdrop-filter]:bg-ink/85"
      aria-label="Pro navigation"
    >
      <div className="max-w-md mx-auto grid grid-cols-5">
        {tabs.map((t) => {
          const active = t.exact
            ? pathname === t.href
            : pathname?.startsWith(t.href);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center justify-center pt-3 pb-2 text-[11px] tracking-wide transition",
                active ? "text-bone" : "text-bone/55 hover:text-bone"
              )}
            >
              {/* Active accent — sol-gold bar under the active tab. */}
              <span
                className={cn(
                  "absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-8 transition-opacity",
                  active
                    ? "opacity-100 bg-gradient-to-r from-royal to-sol"
                    : "opacity-0"
                )}
                aria-hidden
              />
              <span className="relative">
                <Icon active={!!active} />
                {t.inbox && unread > 0 && (
                  <span
                    className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-sol text-ink font-mono text-[10px] tabular font-bold flex items-center justify-center leading-none"
                    aria-label={`${unread} unread`}
                  >
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </span>
              <span className={cn("mt-1 font-medium", active && "font-semibold")}>
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* iOS home-indicator cushion */}
      <div className="h-[env(safe-area-inset-bottom)]" aria-hidden />
    </nav>
  );
}

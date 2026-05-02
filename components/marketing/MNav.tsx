"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Wordmark } from "@/components/brand/Wordmark";
import { LanguagePicker } from "@/components/i18n/LanguagePicker";

// Marketing primary nav. Five service entries on desktop. Mobile gets
// a slide-down panel triggered by the hamburger so the same surface is
// reachable on phones (was previously hidden behind a single CTA).
export function MNav() {
  const t = useTranslations();
  const tn = useTranslations("nav");
  const tc = useTranslations("common");
  const links = [
    { href: "/auto", label: tn("auto") },
    { href: "/big-rig", label: tn("bigRig") },
    { href: "/home", label: tn("home") },
    { href: "/business", label: tn("business") },
    { href: "/wash", label: tn("wash") },
  ];
  const [open, setOpen] = useState(false);
  // Quiet the ESLint "no unused t" hint — t is reserved for the
  // membership-link copy below if we extract it later.
  void t;

  return (
    <header className="border-b border-mist bg-bone relative z-30">
      <nav className="max-w-screen mx-auto flex items-center justify-between px-6 md:px-14 py-5">
        <Link href="/" className="shrink-0" onClick={() => setOpen(false)}>
          <Wordmark size={26} />
        </Link>

        {/* Desktop links — same structure as before. */}
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
          <LanguagePicker className="hidden md:inline-flex" />
          <Link
            href="/sign-in?role=washer"
            className="text-xs text-royal hover:text-ink hidden md:inline uppercase font-bold"
          >
            {tn("wash")}
          </Link>
          <Link
            href="/sign-in"
            className="text-xs text-ink/85 hover:text-ink hidden sm:inline uppercase font-bold"
          >
            {tc("signIn")}
          </Link>
          <Link
            href="/app/book"
            className="bg-ink text-bone px-4 sm:px-5 py-3 text-xs sm:text-sm font-bold uppercase tracking-wide hover:bg-royal transition-colors"
          >
            {tc("book")}
          </Link>

          {/* Mobile hamburger — visible <lg, toggles the slide-down panel. */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="lg:hidden ml-1 inline-flex flex-col justify-center w-9 h-9 border border-mist hover:border-ink transition"
          >
            <span
              className={`block h-[2px] bg-ink transition-all mx-auto ${
                open ? "w-5 translate-y-[3px] rotate-45" : "w-5"
              }`}
            />
            <span
              className={`block h-[2px] bg-ink mt-1.5 transition-opacity mx-auto ${
                open ? "opacity-0" : "w-5 opacity-100"
              }`}
            />
            <span
              className={`block h-[2px] bg-ink mt-1.5 transition-all mx-auto ${
                open ? "w-5 -translate-y-[7px] -rotate-45" : "w-5"
              }`}
            />
          </button>
        </div>
      </nav>

      {/* Mobile slide-down panel. Hidden on lg+ since the inline links
          are already visible. */}
      {open && (
        <>
          <button
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="lg:hidden fixed inset-0 z-20 bg-ink/30 backdrop-blur-sm"
          />
          <div className="lg:hidden absolute top-full left-0 right-0 z-30 bg-bone border-b border-mist shadow-lg">
            <div className="px-6 py-6 grid grid-cols-1 gap-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="px-3 py-3.5 text-base font-medium uppercase tracking-wide text-ink hover:bg-mist hover:text-royal transition flex justify-between items-center"
                >
                  <span>{l.label}</span>
                  <span className="text-smoke">→</span>
                </Link>
              ))}
              <Link
                href="/app/membership"
                onClick={() => setOpen(false)}
                className="px-3 py-3.5 text-base font-bold uppercase tracking-wide text-royal hover:bg-mist transition flex justify-between items-center"
              >
                <span>Sheen+ membership</span>
                <span className="text-royal">→</span>
              </Link>

              <div className="h-px bg-mist my-3" />

              <Link
                href="/sign-in"
                onClick={() => setOpen(false)}
                className="px-3 py-3 text-sm font-bold uppercase tracking-wide text-ink hover:bg-mist transition"
              >
                {tc("signIn")}
              </Link>
              <Link
                href="/sign-in?role=washer"
                onClick={() => setOpen(false)}
                className="px-3 py-3 text-sm font-bold uppercase tracking-wide text-royal hover:bg-mist transition"
              >
                {tn("wash")}
              </Link>
              <div className="px-3 pt-3 mt-2 border-t border-mist">
                <LanguagePicker className="w-full" />
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}

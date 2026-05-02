"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_LABELS, type Locale, isLocale } from "@/i18n/locales";

/**
 * Inline language picker. On change:
 *   1. Writes the NEXT_LOCALE cookie so the next request renders in
 *      the new language (the i18n/request.ts config reads this cookie).
 *   2. If the user is signed in, fires PATCH /api/users/me { locale }
 *      so the preference follows them across devices.
 *   3. router.refresh() so the current page re-renders server-side
 *      with the new catalog. No URL change — same /auto, /wash, etc.
 *
 * Mounted in MNav (top-right), MFooter, /app/me, /pro/me.
 */
export function LanguagePicker({
  className = "",
  variant = "light",
}: {
  className?: string;
  variant?: "light" | "dark";
}) {
  const locale = useLocale() as Locale;
  const t = useTranslations("languagePicker");
  const router = useRouter();
  const [pending, start] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    if (!isLocale(next) || next === locale) return;

    // 1-year cookie so the picker decision sticks across visits.
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;

    start(() => {
      // Best-effort cross-device persistence — silently no-ops for anon
      // users (the API returns 401 and we just rely on the cookie).
      fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      }).catch(() => {});
      router.refresh();
    });
  }

  const styles =
    variant === "dark"
      ? "bg-white/10 text-bone border-bone/15 focus:border-sol"
      : "bg-bone text-ink border-mist focus:border-royal";

  return (
    <label className={`inline-flex items-center gap-2 ${className}`}>
      <span className="font-mono text-[10px] uppercase tracking-wider opacity-70">
        {t("label")}
      </span>
      <select
        value={locale}
        onChange={onChange}
        disabled={pending}
        aria-label={t("label")}
        className={`text-xs font-medium px-2 py-1 border outline-none ${styles} ${
          pending ? "opacity-60 cursor-wait" : ""
        }`}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_LABELS[l]}
          </option>
        ))}
      </select>
    </label>
  );
}

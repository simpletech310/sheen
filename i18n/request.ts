import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./locales";

export const LOCALE_COOKIE = "NEXT_LOCALE";

// Read the visitor's locale on every request. Priority order:
//   1. Explicit cookie set by the LanguagePicker (or by the auth flow
//      after a server-side `users.locale` lookup).
//   2. Accept-Language header (first match against our supported set).
//   3. Default ("en").
//
// We deliberately don't use URL-prefixed locales — this lets every
// existing marketing URL (/auto, /wash, /home) keep its SEO equity
// while still rendering localized content per visitor.
export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;

  let locale: Locale = DEFAULT_LOCALE;
  if (cookieLocale && isLocale(cookieLocale)) {
    locale = cookieLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});

// Single source of truth for the 8 supported locales. The picker UI,
// the next-intl middleware, and the chat-translation endpoint all read
// from here so adding a 9th language is a one-line change.

export const LOCALES = [
  "en", // English
  "es", // Spanish
  "ko", // Korean
  "zh", // Mandarin Chinese (Simplified)
  "vi", // Vietnamese
  "pt", // Portuguese
  "fr", // French
  "ru", // Russian
] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

// Human-facing labels rendered by the LanguagePicker. Each entry is the
// language NAME in its own language so a Korean speaker sees "한국어",
// not "Korean".
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
  ko: "한국어",
  zh: "中文",
  vi: "Tiếng Việt",
  pt: "Português",
  fr: "Français",
  ru: "Русский",
};

// English names too — used in the chat "Translated from {lang}" tag,
// which shows the source language in the viewer's own language. Until
// we localise these names per-locale, English names are clear enough.
export const LOCALE_ENGLISH_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Spanish",
  ko: "Korean",
  zh: "Chinese",
  vi: "Vietnamese",
  pt: "Portuguese",
  fr: "French",
  ru: "Russian",
};

export function isLocale(s: string): s is Locale {
  return (LOCALES as readonly string[]).includes(s);
}

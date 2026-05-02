import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { LOCALES, DEFAULT_LOCALE, isLocale } from "@/i18n/locales";

// Keep middleware narrow + bulletproof. We do two things:
//   1. Refresh the Supabase session cookie via @supabase/ssr and
//      gate /app/*, /pro/*, /partner/dashboard so anonymous users
//      get bounced to /sign-in.
//   2. On any request without a NEXT_LOCALE cookie set, sniff the
//      Accept-Language header and write a one-year cookie so the
//      visitor's preferred language sticks across pages and reloads.
//      The picker UI overrides this any time.
//
// We deliberately don't URL-prefix locales (no /es/auto, /ko/wash) —
// keeps existing SEO equity on the English URLs and avoids a giant
// app/[locale]/ refactor across every page in the tree.
const LOCALE_COOKIE = "NEXT_LOCALE";

function pickLocaleFromAcceptLanguage(header: string | null): string {
  if (!header) return DEFAULT_LOCALE;
  // Accept-Language: en-US,en;q=0.9,es;q=0.8
  const parts = header
    .split(",")
    .map((p) => p.split(";")[0].trim().split("-")[0].toLowerCase())
    .filter(Boolean);
  for (const p of parts) {
    if (isLocale(p)) return p;
  }
  return DEFAULT_LOCALE;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const requiresAuth =
    path.startsWith("/app") ||
    path.startsWith("/pro") ||
    path === "/partner/dashboard";

  // Auth-gated path — run session refresh first.
  if (requiresAuth) {
    try {
      const { response, user } = await updateSession(request);
      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = "/sign-in";
        url.searchParams.set("next", path);
        return NextResponse.redirect(url);
      }
      maybeSeedLocaleCookie(request, response);
      return response;
    } catch (err) {
      console.error("middleware error:", err);
      const fallback = NextResponse.next();
      maybeSeedLocaleCookie(request, fallback);
      return fallback;
    }
  }

  // Sign-in / sign-up — refresh session but don't gate. Lets the
  // page redirect logged-in users to their dashboard if needed.
  if (path === "/sign-in" || path === "/sign-up") {
    try {
      const { response } = await updateSession(request);
      maybeSeedLocaleCookie(request, response);
      return response;
    } catch (err) {
      console.error("middleware error:", err);
      const fallback = NextResponse.next();
      maybeSeedLocaleCookie(request, fallback);
      return fallback;
    }
  }

  // Everything else — marketing surfaces. Just seed the locale
  // cookie if needed and pass through.
  const response = NextResponse.next();
  maybeSeedLocaleCookie(request, response);
  return response;
}

function maybeSeedLocaleCookie(req: NextRequest, res: NextResponse) {
  const existing = req.cookies.get(LOCALE_COOKIE)?.value;
  if (existing && isLocale(existing)) return;
  const detected = pickLocaleFromAcceptLanguage(
    req.headers.get("accept-language")
  );
  res.cookies.set(LOCALE_COOKIE, detected, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

export const config = {
  matcher: [
    // Auth surfaces (session refresh + gating)
    "/app/:path*",
    "/pro/:path*",
    "/partner/dashboard",
    "/sign-in",
    "/sign-up",
    // Marketing surfaces (locale-cookie seeding only). Skip API,
    // _next internals, and static files.
    "/",
    "/((?!api|_next|admin|auth|forgot-password|reset-password|icons|img|.*\\..*).*)",
  ],
};

// Keep import live so tree-shake doesn't drop the supported-locale
// constants when only the type is referenced.
void LOCALES;

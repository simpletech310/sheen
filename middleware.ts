import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Keep middleware narrow + bulletproof. We only:
//   1. refresh the Supabase session cookie via @supabase/ssr
//   2. redirect unauthenticated users away from /app/*, /pro/*, /partner/dashboard
//
// Role-based gating (washer-only, partner_owner-only) lives on the pages themselves
// as server components — that way a transient Supabase error never blackholes the
// whole site behind a 500 from middleware.
export async function middleware(request: NextRequest) {
  try {
    const { response, user } = await updateSession(request);
    const path = request.nextUrl.pathname;

    const requiresAuth =
      path.startsWith("/app") ||
      path.startsWith("/pro") ||
      path === "/partner/dashboard";

    if (requiresAuth && !user) {
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }

    return response;
  } catch (err) {
    // Never throw from middleware — log and let the request through. The page
    // itself will redirect via its own auth check if needed.
    console.error("middleware error:", err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    // Only run middleware on routes that need session refresh or auth gating.
    "/app/:path*",
    "/pro/:path*",
    "/partner/dashboard",
    "/sign-in",
    "/sign-up",
  ],
};

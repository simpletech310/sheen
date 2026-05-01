import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDefaultLandingForRole } from "@/lib/auth-redirect";

/**
 * GET /auth/callback?code=...&next=...
 * Supabase email-confirm + magic-link land here. Exchanges the code,
 * then routes to ?next= if explicitly set; otherwise looks up the
 * confirmed user's role and routes by role (washer → /pro, etc).
 *
 * The redirect base must be the env'd public URL — Vercel sets a
 * different origin on every preview, so origin-from-request would
 * route preview signups to themselves and break prod email links.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const explicitNext = searchParams.get("next");
  // Supabase appends `type` to recovery + email-change confirmations so we
  // can route them to the right post-auth surface. `signup` and `magiclink`
  // both land in the app proper.
  const linkType = searchParams.get("type");

  // Prefer the configured public URL so production email links never
  // bounce a confirmation back to localhost or a stale preview.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin;

  let dest = explicitNext;
  let isFreshSignup = false;

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Recovery links arrive with an active session but the user hasn't
      // chosen a new password yet — send them to the reset surface so the
      // password change happens before they land in the app.
      if (linkType === "recovery") {
        return NextResponse.redirect(`${baseUrl}/reset-password`);
      }
      const { data: row } = await supabase
        .from("users")
        .select("role, created_at")
        .eq("id", data.user.id)
        .maybeSingle();
      if (!dest) dest = getDefaultLandingForRole((row as any)?.role);
      // If the public.users row was created in the last 5 minutes, treat
      // this as a brand-new account and tag the redirect so the customer
      // /app or washer /pro layout knows to show the install nudge once.
      const createdAt = (row as any)?.created_at;
      if (createdAt && Date.now() - new Date(createdAt).getTime() < 5 * 60 * 1000) {
        isFreshSignup = true;
      }
    }
  }

  const finalPath = dest || "/app";
  // Append ?welcome=1 (preserving any existing query) so the install +
  // push welcome flow can fire exactly once on first paint.
  let withWelcome = finalPath;
  if (isFreshSignup) {
    const sep = finalPath.includes("?") ? "&" : "?";
    withWelcome = `${finalPath}${sep}welcome=1`;
  }

  return NextResponse.redirect(`${baseUrl}${withWelcome}`);
}

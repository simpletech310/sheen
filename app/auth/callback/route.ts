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

  // Prefer the configured public URL so production email links never
  // bounce a confirmation back to localhost or a stale preview.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin;

  let dest = explicitNext;

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && !dest && data.user) {
      // No explicit next? Route by role from public.users.
      const { data: row } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      dest = getDefaultLandingForRole((row as any)?.role);
    }
  }

  return NextResponse.redirect(`${baseUrl}${dest || "/app"}`);
}

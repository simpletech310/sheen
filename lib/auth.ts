import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type UserRole = "customer" | "washer" | "partner_owner" | "admin";

/**
 * Server-side guard: requires the visitor to be authenticated.
 * Use at the top of any /app/* page that needs a logged-in customer.
 */
export async function requireAuth(redirectTo = "/sign-in") {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(redirectTo);
  return { supabase, user };
}

/**
 * Server-side guard: requires the visitor to have one of the allowed roles.
 * Falls back to fallback URL if their role doesn't match.
 */
export async function requireRole(
  allowed: UserRole[],
  fallbackUrl: string
) {
  const { supabase, user } = await requireAuth();
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !allowed.includes(profile.role as UserRole)) {
    redirect(fallbackUrl);
  }
  return { supabase, user, role: profile.role as UserRole };
}

import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export type UserRole = "customer" | "washer" | "partner_owner" | "admin";

/**
 * Guarantees a public.users row exists for the given auth user before code
 * tries to insert anything that FKs into it (vehicles, bookings, addresses).
 * The handle_new_user() trigger covers fresh signups, but pre-trigger
 * accounts and any signups where the trigger fired into an error end up
 * orphaned. Uses the service role because public.users has no INSERT policy
 * for authenticated clients.
 */
export async function ensurePublicUser(user: { id: string; email?: string | null }) {
  const admin = createServiceClient();
  await admin
    .from("users")
    .upsert(
      { id: user.id, email: user.email ?? null, role: "customer" },
      { onConflict: "id", ignoreDuplicates: true }
    );
  await admin
    .from("customer_profiles")
    .upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });
}

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

// Single source of truth for "where should this user land after auth".
// Used by /sign-in (post-login lookup) and /sign-up (right after the
// signup mutation lands the role on public.users).

export type Role = "admin" | "washer" | "partner_owner" | "customer" | string | null | undefined;

export function getDefaultLandingForRole(role: Role): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "washer":
      return "/pro";
    case "partner_owner":
      return "/partner/dashboard";
    default:
      return "/app";
  }
}

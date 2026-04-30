import { redirect } from "next/navigation";

// Onboarding moved to /pro/verify — keep this route alive for old deep
// links, signup detours, and notification deep-links.
export default function OnboardRedirect() {
  redirect("/pro/verify");
}

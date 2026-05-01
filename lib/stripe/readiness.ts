import { getStripe } from "./server";

export type ReadinessResult =
  | { ready: true; accountId: string }
  | { ready: false; reason: "no_account" | "charges_disabled" | "payouts_disabled" | "lookup_failed" };

// Check that a connected Stripe account can accept charges and receive payouts.
// Used to gate job claims and tip destinations so we never assign work or route
// money to a half-onboarded pro.
export async function checkStripeReadiness(stripeAccountId: string | null | undefined): Promise<ReadinessResult> {
  if (!stripeAccountId) return { ready: false, reason: "no_account" };
  try {
    const account = await getStripe().accounts.retrieve(stripeAccountId);
    if (!account.charges_enabled) return { ready: false, reason: "charges_disabled" };
    if (!account.payouts_enabled) return { ready: false, reason: "payouts_disabled" };
    return { ready: true, accountId: stripeAccountId };
  } catch {
    return { ready: false, reason: "lookup_failed" };
  }
}

export function readinessMessage(reason: Exclude<ReadinessResult, { ready: true }>["reason"]): string {
  switch (reason) {
    case "no_account":
      return "Finish Stripe Connect setup before claiming jobs.";
    case "charges_disabled":
      return "Your Stripe account isn't ready to accept payments yet. Complete onboarding at /pro/verify.";
    case "payouts_disabled":
      return "Your Stripe account can't receive payouts yet. Add your bank details at /pro/verify.";
    case "lookup_failed":
      return "We couldn't verify your Stripe account. Try again in a moment.";
  }
}

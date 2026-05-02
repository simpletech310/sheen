import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { WalletActions } from "./WalletActions";
import { getStripe } from "@/lib/stripe/server";
import { WalletLiveTotals, type WalletPayout } from "@/components/pro/WalletLiveTotals";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const supabase = createClient();
  const stripe = getStripe();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: payouts } = await supabase
    .from("payouts")
    .select(
      "id, amount_cents, status, kind, created_at, booking_id, bookings(services(tier_name))"
    )
    .eq("washer_id", user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(50);

  // Stripe-side balance — only changes on Stripe's settlement schedule, so
  // we read it here once and pass it through. The escrow figure (money the
  // customer is holding pre-approval) comes from the local payouts table
  // and is updated live by WalletLiveTotals.
  let stripeAvailable = 0;
  let stripePending = 0;
  let stripeInstantAvailable = 0;
  let connected = false;

  const { data: wp } = await supabase
    .from("washer_profiles")
    .select("stripe_account_id")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  if (wp?.stripe_account_id) {
    try {
      const balance = await stripe.balance.retrieve(
        {},
        { stripeAccount: wp.stripe_account_id }
      );
      stripeAvailable = balance.available.reduce((a, b) => a + b.amount, 0);
      stripePending = balance.pending.reduce((a, b) => a + b.amount, 0);
      stripeInstantAvailable =
        (balance as any).instant_available?.reduce(
          (a: number, b: any) => a + b.amount,
          0
        ) ?? 0;
      connected = true;
    } catch (e) {
      console.error("Error fetching stripe balance", e);
    }
  }

  return (
    <div className="px-5 pt-10 pb-8">
      <Eyebrow className="!text-bone/60" prefix={null}>
        Wallet
      </Eyebrow>

      <WalletLiveTotals
        userId={user?.id ?? ""}
        initialPayouts={(payouts ?? []) as unknown as WalletPayout[]}
        stripeAvailable={stripeAvailable}
        stripePending={stripePending}
        stripeInstantAvailable={stripeInstantAvailable}
        connected={connected}
        cashOutSlot={<WalletActions />}
      />
    </div>
  );
}

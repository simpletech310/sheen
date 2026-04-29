import { Eyebrow } from "@/components/brand/Eyebrow";
import { createClient } from "@/lib/supabase/server";

export default async function WalletPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("lifetime_spend_cents, trip_count")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  const credit = Math.floor((profile?.lifetime_spend_cents ?? 0) * 0.18) / 100;

  return (
    <div className="px-5 pt-10 pb-8">
      <Eyebrow>Wallet</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-6">Your wallet</h1>

      <div className="bg-cobalt text-bone p-6 rounded-md">
        <div className="font-mono text-[10px] uppercase opacity-70">Loyalty credit</div>
        <div className="display tabular text-4xl mt-2">${credit.toFixed(2)}</div>
        <div className="text-xs opacity-70 mt-2">
          Earn 18% back on every wash. Applied automatically at next checkout.
        </div>
      </div>

      <div className="mt-6">
        <Eyebrow>Payment methods</Eyebrow>
        <div className="mt-3 space-y-2">
          <div className="bg-mist/40 p-4 flex justify-between items-center">
            <div>
              <div className="text-sm font-semibold">Apple Pay</div>
              <div className="text-xs text-smoke font-mono">•••• 4419</div>
            </div>
            <span className="font-mono text-[10px] text-smoke uppercase">Default</span>
          </div>
        </div>
      </div>
    </div>
  );
}

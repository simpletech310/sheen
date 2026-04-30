import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { WashHandleCard } from "./WashHandleCard";

export const dynamic = "force-dynamic";

export default async function ProMePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: wp } = await supabase
    .from("washer_profiles")
    .select("status, stripe_account_id, jobs_completed, rating_avg, wash_handle, background_check_verified")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  return (
    <div className="px-5 pt-10 pb-8">
      <Eyebrow className="!text-bone/60" prefix={null}>
        Profile
      </Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">{user?.email}</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-6" />

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white/5 p-4">
          <div className="font-mono text-[10px] uppercase opacity-60">Jobs done</div>
          <div className="display tabular text-3xl mt-1">{wp?.jobs_completed ?? 0}</div>
        </div>
        <div className="bg-white/5 p-4">
          <div className="font-mono text-[10px] uppercase opacity-60">Rating</div>
          <div className="display tabular text-3xl mt-1">{wp?.rating_avg ?? "—"} ★</div>
        </div>
      </div>

      {wp?.wash_handle && <WashHandleCard handle={wp.wash_handle} />}

      <div className="space-y-2 mt-5">
        <Link href="/pro/onboard" className="block bg-white/5 p-3 text-sm hover:bg-white/10">
          {wp?.stripe_account_id ? "Stripe payouts ✓" : "Set up Stripe payouts →"}
        </Link>
        <Link href="/pro/availability" className="block bg-white/5 p-3 text-sm hover:bg-white/10">
          Availability →
        </Link>
        <Link href="/pro/earnings" className="block bg-white/5 p-3 text-sm hover:bg-white/10">
          Earnings · trend →
        </Link>
        <Link href="/pro/wallet" className="block bg-white/5 p-3 text-sm hover:bg-white/10">
          Wallet & payouts →
        </Link>
        <div className="bg-white/5 p-3 text-sm">
          Status:{" "}
          <span className={wp?.status === "active" ? "text-good" : "text-sol"}>
            {wp?.status ?? "pending"}
          </span>
          {wp?.background_check_verified && (
            <span className="ml-3 font-mono text-[10px] uppercase tracking-wider text-good">
              ✓ Verified
            </span>
          )}
        </div>
      </div>

      <form action="/api/auth/sign-out" method="post" className="mt-8">
        <button type="submit" className="text-sm text-bad underline">
          Sign out
        </button>
      </form>
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";

export default async function ProMePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: wp } = await supabase
    .from("washer_profiles")
    .select("status, stripe_account_id, jobs_completed, rating_avg")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  return (
    <div className="px-5 pt-10 pb-8">
      <Eyebrow className="!text-bone/60" prefix={null}>
        Profile
      </Eyebrow>
      <h1 className="display text-3xl mt-3 mb-6">{user?.email}</h1>

      <div className="grid grid-cols-2 gap-3 mb-7">
        <div className="bg-white/5 p-4">
          <div className="font-mono text-[10px] uppercase opacity-60">Jobs done</div>
          <div className="display tabular text-3xl mt-1">{wp?.jobs_completed ?? 0}</div>
        </div>
        <div className="bg-white/5 p-4">
          <div className="font-mono text-[10px] uppercase opacity-60">Rating</div>
          <div className="display tabular text-3xl mt-1">{wp?.rating_avg ?? "—"} ★</div>
        </div>
      </div>

      <div className="space-y-2">
        <Link href="/pro/onboard" className="block bg-white/5 p-3 text-sm">
          {wp?.stripe_account_id ? "Stripe payouts ✓" : "Set up Stripe payouts →"}
        </Link>
        <div className="bg-white/5 p-3 text-sm">
          Status:{" "}
          <span className={wp?.status === "active" ? "text-good" : "text-wax"}>
            {wp?.status ?? "pending"}
          </span>
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

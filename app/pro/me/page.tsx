import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { WashHandleCard } from "./WashHandleCard";
import { BigRigCapabilityCard } from "./BigRigCapabilityCard";

export const dynamic = "force-dynamic";

export default async function ProMePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: wp }, { data: me }] = await Promise.all([
    supabase
      .from("washer_profiles")
      .select(
        "status, stripe_account_id, jobs_completed, rating_avg, wash_handle, background_check_verified, can_wash_big_rig, bio, service_radius_miles"
      )
      .eq("user_id", user?.id ?? "")
      .maybeSingle(),
    supabase
      .from("users")
      .select("full_name, email")
      .eq("id", user?.id ?? "")
      .maybeSingle(),
  ]);

  return (
    <div className="px-5 pt-10 pb-8">
      <Eyebrow className="!text-bone/60" prefix={null}>
        Profile
      </Eyebrow>
      <div className="flex items-baseline justify-between mt-3 mb-2 gap-3">
        <h1 className="display text-3xl truncate">
          {me?.full_name || user?.email}
        </h1>
        <Link
          href="/pro/me/edit"
          className="shrink-0 text-[11px] uppercase tracking-wider text-sol hover:text-bone font-bold"
        >
          Edit →
        </Link>
      </div>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-2" />
      <div className="text-xs text-bone/55">{me?.email}</div>

      {wp?.bio && (
        <p className="text-sm text-bone/80 mt-4 leading-relaxed bg-white/5 p-4 border-l-2 border-royal">
          {wp.bio}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 mt-5 mb-5">
        <div className="bg-white/5 p-4">
          <div className="font-mono text-[10px] uppercase opacity-60">Jobs</div>
          <div className="display tabular text-2xl mt-1">{wp?.jobs_completed ?? 0}</div>
        </div>
        <div className="bg-white/5 p-4">
          <div className="font-mono text-[10px] uppercase opacity-60">Rating</div>
          <div className="display tabular text-2xl mt-1">
            {wp?.rating_avg ?? "—"}
            <span className="text-sol ml-1 text-base">★</span>
          </div>
        </div>
        <div className="bg-white/5 p-4">
          <div className="font-mono text-[10px] uppercase opacity-60">Radius</div>
          <div className="display tabular text-2xl mt-1">
            {wp?.service_radius_miles ?? 5}
            <span className="text-bone/40 ml-1 text-base">mi</span>
          </div>
        </div>
      </div>

      <div className="bg-white/5 p-3 text-sm mb-5 flex items-center justify-between">
        <span>
          Status:{" "}
          <span className={wp?.status === "active" ? "text-good" : "text-sol"}>
            {wp?.status ?? "pending"}
          </span>
        </span>
        {wp?.background_check_verified && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-good">
            ✓ Verified
          </span>
        )}
      </div>

      {wp?.wash_handle && <WashHandleCard handle={wp.wash_handle} />}

      <div className="mt-5">
        <BigRigCapabilityCard initialCapable={!!wp?.can_wash_big_rig} />
      </div>

      {/* Footer link list — every secondary surface lives here. */}
      <Eyebrow className="!text-bone/60 mt-8" prefix={null}>
        More
      </Eyebrow>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link href="/pro/verify" className="bg-white/5 p-3 text-sm hover:bg-white/10">
          Verification →
        </Link>
        <Link href="/pro/earnings" className="bg-white/5 p-3 text-sm hover:bg-white/10">
          Earnings →
        </Link>
        <Link href="/pro/wallet" className="bg-white/5 p-3 text-sm hover:bg-white/10">
          Wallet →
        </Link>
        <Link href="/pro/reviews" className="bg-white/5 p-3 text-sm hover:bg-white/10">
          Reviews →
        </Link>
        <Link href="/pro/penalties" className="bg-white/5 p-3 text-sm hover:bg-white/10">
          Penalties →
        </Link>
        <Link href="/pro/tax" className="bg-white/5 p-3 text-sm hover:bg-white/10">
          Tax summary →
        </Link>
        <Link href="/pro/help" className="bg-white/5 p-3 text-sm hover:bg-white/10">
          Help →
        </Link>
        <Link href="/pro/settings" className="bg-white/5 p-3 text-sm hover:bg-white/10">
          Settings →
        </Link>
      </div>

      {/* Sign-out lives canonically on /pro/settings; here we just point. */}
      <Link
        href="/pro/settings"
        className="mt-8 block text-center text-xs uppercase tracking-wider text-bone/50 hover:text-bone"
      >
        Settings &amp; sign out →
      </Link>
    </div>
  );
}

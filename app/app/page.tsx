import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";

export const dynamic = "force-dynamic";

export default async function CustomerHome() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const firstName = (profile?.full_name ?? user?.email ?? "there").split(" ")[0]?.split("@")[0];

  // Lifetime completed wash count for the hero strip
  const { count: washCount } = await supabase
    .from("bookings")
    .select("id", { head: true, count: "exact" })
    .eq("customer_id", user?.id ?? "")
    .eq("status", "completed");

  return (
    <>
      {/* Branded hero strip */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/img/hero.jpg)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-royal/85 via-royal/70 to-ink/85" />
        <div className="relative px-5 pt-10 pb-9 text-bone">
          <Eyebrow className="!text-sol" prefix="──">
            Hi, {firstName}
          </Eyebrow>
          <h1 className="display text-[36px] leading-[0.95] mt-4">
            What&rsquo;s getting
            <br />
            <span className="text-sol">cleaned today?</span>
          </h1>
          <div className="mt-5 flex gap-6 text-xs">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">Washes</div>
              <div className="display tabular text-xl mt-0.5">{washCount ?? 0}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">Status</div>
              <div className="display tabular text-xl mt-0.5">Ready</div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-sol" />
      </div>

      <div className="px-5 pt-7 pb-8">
        <Eyebrow>Pick a service</Eyebrow>
        <div className="mt-3 space-y-3">
          <Link
            href="/app/book/auto"
            className="block bg-bone border border-mist hover:border-ink p-5 transition group"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="display text-2xl group-hover:text-royal transition">Auto</div>
                <div className="text-xs text-smoke mt-1">4 tiers · Express → Showroom</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] text-smoke uppercase">From</div>
                <div className="display tabular text-xl">$35</div>
              </div>
            </div>
            <div className="mt-4 h-[2px] w-12 bg-gradient-to-r from-royal to-sol opacity-0 group-hover:opacity-100 transition" />
          </Link>

          <div className="block bg-mist/30 p-5 cursor-not-allowed">
            <div className="flex justify-between items-start">
              <div>
                <div className="display text-2xl text-smoke">Home</div>
                <div className="text-xs text-smoke mt-1">Phase 2 — coming soon</div>
              </div>
              <div className="text-right text-smoke">
                <div className="font-mono text-[10px] uppercase">From</div>
                <div className="display tabular text-xl">$185</div>
              </div>
            </div>
          </div>

          <Link
            href="/business"
            className="block bg-bone border border-mist hover:border-ink p-5 transition group"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="display text-2xl group-hover:text-royal transition">Commercial</div>
                <div className="text-xs text-smoke mt-1">Storefront · fleet · post-construction</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] text-smoke uppercase">Quoted</div>
                <div className="display text-xl">→</div>
              </div>
            </div>
            <div className="mt-4 h-[2px] w-12 bg-gradient-to-r from-royal to-sol opacity-0 group-hover:opacity-100 transition" />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-2">
          <Link href="/app/washes" className="bg-mist/40 hover:bg-mist transition p-3 text-center">
            <div className="font-mono text-[10px] uppercase tracking-wider text-smoke">Washes</div>
            <div className="display text-lg mt-1">→</div>
          </Link>
          <Link href="/app/wallet" className="bg-mist/40 hover:bg-mist transition p-3 text-center">
            <div className="font-mono text-[10px] uppercase tracking-wider text-smoke">Wallet</div>
            <div className="display text-lg mt-1">→</div>
          </Link>
          <Link href="/app/membership" className="bg-mist/40 hover:bg-mist transition p-3 text-center">
            <div className="font-mono text-[10px] uppercase tracking-wider text-smoke">Sheen+</div>
            <div className="display text-lg mt-1">→</div>
          </Link>
        </div>
      </div>
    </>
  );
}

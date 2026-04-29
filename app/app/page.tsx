import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";

export default async function CustomerHome() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const firstName = (profile?.full_name ?? user?.email ?? "there").split(" ")[0]?.split("@")[0];

  return (
    <div className="px-5 pt-12 pb-8">
      <Eyebrow>Sheen · Hi, {firstName}</Eyebrow>
      <h1 className="display text-[40px] leading-tight mt-3 mb-7">
        What&rsquo;s getting
        <br />
        cleaned today?
      </h1>

      <div className="space-y-3">
        <Link
          href="/app/book/auto"
          className="block bg-mist/50 p-5 hover:bg-mist transition-colors"
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="display text-2xl">Auto</div>
              <div className="text-xs text-smoke mt-1">4 tiers · Express → Showroom</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[11px] text-smoke">FROM</div>
              <div className="display tabular text-xl">$35</div>
            </div>
          </div>
        </Link>

        <div className="block bg-mist/30 p-5 cursor-not-allowed">
          <div className="flex justify-between items-start">
            <div>
              <div className="display text-2xl text-smoke">Home</div>
              <div className="text-xs text-smoke mt-1">Phase 2 — coming soon</div>
            </div>
            <div className="text-right text-smoke">
              <div className="font-mono text-[11px]">FROM</div>
              <div className="display tabular text-xl">$185</div>
            </div>
          </div>
        </div>

        <Link href="/business" className="block bg-mist/50 p-5 hover:bg-mist transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <div className="display text-2xl">Commercial</div>
              <div className="text-xs text-smoke mt-1">Storefront, fleet, post-construction</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[11px] text-smoke">QUOTED</div>
              <div className="display text-xl">→</div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

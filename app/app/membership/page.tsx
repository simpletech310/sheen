import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";
import { MembershipActions } from "./MembershipActions";

export const dynamic = "force-dynamic";

export default async function MembershipPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/app/membership");

  const { data: plans } = await supabase
    .from("membership_plans")
    .select("id, tier, display_name, monthly_price_cents, included_washes, max_service_tier, description, stripe_price_id, service_categories, allowed_tier_names")
    .eq("active", true)
    .order("sort_order");

  const { data: current } = await supabase
    .from("memberships")
    .select("id, plan_id, status, washes_used, current_period_end, cancel_at_period_end, membership_plans(tier, display_name, included_washes)")
    .eq("user_id", user.id)
    .in("status", ["active", "past_due", "paused"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="px-5 pt-10 pb-8">
      <Eyebrow>Membership</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-6">SHEEN+</h1>

      {current ? (
        <div className="bg-royal text-bone p-5 mb-6 relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
          <div className="font-mono text-[10px] uppercase opacity-80">
            {current.status === "paused" ? "Paused" : "Active"} ·{" "}
            {(current as any).membership_plans?.tier?.toUpperCase()}
          </div>
          <div className="display text-3xl mt-2 mb-2">{(current as any).membership_plans?.display_name}</div>
          <div className="text-sm opacity-90">
            {current.washes_used ?? 0} of {(current as any).membership_plans?.included_washes} washes used this period.
          </div>
          <div className="text-xs opacity-70 mt-1">
            {current.status === "paused"
              ? "Billing paused — resume any time."
              : `Renews ${new Date(current.current_period_end).toLocaleDateString()}${
                  current.cancel_at_period_end ? " · cancelling at period end" : ""
                }`}
          </div>
          {!current.cancel_at_period_end && (
            <MembershipActions hasActive={true} isPaused={current.status === "paused"} />
          )}
        </div>
      ) : (
        <p className="text-sm text-smoke mb-6">
          Pick a plan. Cancel anytime — no charges past your current billing period.
        </p>
      )}

      <div className="space-y-3">
        {(plans ?? []).map((p) => {
          const isCurrent = current?.plan_id === p.id;
          return (
            <div
              key={p.id}
              className={`p-5 ${
                isCurrent ? "bg-mist text-ink border-2 border-royal" : "bg-mist/40 text-ink"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 pr-3">
                  <div className="display text-2xl">{p.display_name?.toUpperCase()}</div>
                  <div className="text-xs text-smoke mt-1">
                    {p.included_washes} washes / month
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {((p as any).service_categories ?? ["auto"]).map((cat: string) => (
                      <span
                        key={cat}
                        className="font-mono text-[9px] uppercase tracking-wider bg-royal text-bone px-1.5 py-0.5"
                      >
                        {cat}
                      </span>
                    ))}
                    {((p as any).allowed_tier_names ?? []).map((tn: string) => (
                      <span
                        key={tn}
                        className="font-mono text-[9px] uppercase tracking-wider bg-mist text-ink px-1.5 py-0.5"
                      >
                        {tn}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-smoke mt-2">{p.description}</p>
                </div>
                <div className="text-right">
                  <div className="display tabular text-2xl">{fmtUSD(p.monthly_price_cents)}</div>
                  <div className="font-mono text-[10px] text-smoke">/MO</div>
                </div>
              </div>
              <div className="mt-4">
                <MembershipActions
                  planId={p.id}
                  isCurrent={isCurrent}
                  hasActive={!!current}
                  disabled={!p.stripe_price_id}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-smoke text-center mt-6">
        Membership washes count toward your monthly allowance. Booking above your tier max charges normal rates. 100%
        of tips go to your pro.
      </p>
    </div>
  );
}

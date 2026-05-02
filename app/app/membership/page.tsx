import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";
import { MembershipActions } from "./MembershipActions";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function MembershipPage() {
  const t = await getTranslations("appMembership");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/app/membership");

  const { data: plans } = await supabase
    .from("membership_plans")
    .select("id, tier, display_name, monthly_price_cents, promo_price_cents, standard_price_cents, promo_until, included_washes, max_service_tier, description, stripe_price_id, stripe_price_id_promo, stripe_price_id_standard, service_categories, allowed_tier_names")
    .eq("active", true)
    .order("sort_order");

  const { data: current } = await supabase
    .from("memberships")
    .select("id, plan_id, status, washes_used, current_period_end, cancel_at_period_end, is_promo_locked, price_tier, membership_plans(tier, display_name, included_washes)")
    .eq("user_id", user.id)
    .in("status", ["active", "past_due", "paused"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = Date.now();

  return (
    <div className="px-5 pt-10 pb-8">
      <Eyebrow>{t("eyebrow")}</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-6">{t("pageTitle")}</h1>

      {current ? (
        <div className="bg-royal text-bone p-5 mb-6 relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
          <div className="font-mono text-[10px] uppercase opacity-80">
            {current.status === "paused" ? t("statusPaused") : t("statusActive")} ·{" "}
            {(current as any).membership_plans?.tier?.toUpperCase()}
          </div>
          <div className="display text-3xl mt-2 mb-2">{(current as any).membership_plans?.display_name}</div>
          <div className="text-sm opacity-90">
            {t("washesUsed", { used: current.washes_used ?? 0, total: (current as any).membership_plans?.included_washes })}
          </div>
          <div className="text-xs opacity-70 mt-1">
            {current.status === "paused"
              ? t("billingPaused")
              : `${t("renews")} ${new Date(current.current_period_end).toLocaleDateString()}${
                  current.cancel_at_period_end ? ` · ${t("cancellingAtPeriodEnd")}` : ""
                }`}
          </div>
          {!current.cancel_at_period_end && (
            <MembershipActions hasActive={true} isPaused={current.status === "paused"} />
          )}
        </div>
      ) : (
        <p className="text-sm text-smoke mb-6">
          {t("noPlanDesc")}
        </p>
      )}

      <div className="space-y-3">
        {(plans ?? []).map((p: any) => {
          const isCurrent = current?.plan_id === p.id;
          const inPromoWindow = !!p.promo_until && new Date(p.promo_until).getTime() > now;
          const showPromo = inPromoWindow && p.promo_price_cents && p.standard_price_cents && p.promo_price_cents < p.standard_price_cents;
          // Subscription create endpoint can use the promo Price OR the standard Price
          // OR fall back to the legacy stripe_price_id — disable only if NONE exist.
          const canSubscribe = !!(p.stripe_price_id_promo || p.stripe_price_id_standard || p.stripe_price_id);
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
                    {t("washesPerMonth", { n: p.included_washes })}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(p.service_categories ?? ["auto"]).map((cat: string) => (
                      <span
                        key={cat}
                        className="font-mono text-[9px] uppercase tracking-wider bg-royal text-bone px-1.5 py-0.5"
                      >
                        {cat}
                      </span>
                    ))}
                    {(p.allowed_tier_names ?? []).map((tn: string) => (
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
                  <div className="flex items-baseline justify-end gap-2">
                    <div className="display tabular text-2xl">
                      {fmtUSD(showPromo ? p.promo_price_cents : p.monthly_price_cents)}
                    </div>
                    {showPromo && (
                      <div className="font-mono text-xs tabular text-smoke line-through">
                        {fmtUSD(p.standard_price_cents)}
                      </div>
                    )}
                  </div>
                  <div className="font-mono text-[10px] text-smoke">{t("perMonth")}</div>
                  {showPromo && (
                    <div className="font-mono text-[9px] uppercase tracking-wider text-royal mt-1">
                      {t("promoLocksForLife")}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <MembershipActions
                  planId={p.id}
                  isCurrent={isCurrent}
                  hasActive={!!current}
                  disabled={!canSubscribe}
                />
              </div>
            </div>
          );
        })}
      </div>

      {current?.is_promo_locked && (
        <div className="mt-4 bg-good/10 border-l-2 border-good p-3 text-xs">
          <span className="font-mono uppercase tracking-wider text-good">{t("promoLockedBadge")}</span>{" "}
          {t("promoLockedNote")}
        </div>
      )}

      <p className="text-[11px] text-smoke text-center mt-6">
        {t("footer")}
      </p>
    </div>
  );
}

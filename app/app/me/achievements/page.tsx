import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { AchievementGlyph } from "@/components/badges/AchievementGlyph";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
  const t = await getTranslations("appAchievements");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: catalog }, { data: unlocked }, { data: perks }, { data: credits }] = await Promise.all([
    supabase
      .from("achievements")
      .select("id, display_name, description, icon, bonus_points, sort_order")
      .order("sort_order"),
    supabase
      .from("user_achievements")
      .select("achievement_id, unlocked_at")
      .eq("user_id", user?.id ?? ""),
    supabase
      .from("customer_perks")
      .select("discount_pct, weekend_priority, has_lifetime_express_upgrade, is_founder")
      .eq("user_id", user?.id ?? "")
      .maybeSingle(),
    supabase
      .from("customer_credits")
      .select("id, service_tier_name, service_category, source_achievement_id, status")
      .eq("user_id", user?.id ?? "")
      .eq("status", "available"),
  ]);

  const have = new Map(
    (unlocked ?? []).map((u) => [u.achievement_id, u.unlocked_at])
  );
  const hasAnyPerk =
    !!perks &&
    ((perks.discount_pct ?? 0) > 0 ||
      perks.weekend_priority ||
      perks.has_lifetime_express_upgrade ||
      perks.is_founder);
  const availableCredits = credits ?? [];

  const totalPts = (catalog ?? []).reduce(
    (a, c: any) => (have.has(c.id) ? a + (c.bonus_points ?? 0) : a),
    0
  );
  const earned = (catalog ?? []).filter((c: any) => have.has(c.id)).length;
  const total = catalog?.length ?? 0;

  return (
    <div className="px-5 pt-10 pb-8">
      <Link href="/app/me" className="text-smoke text-sm">
        {t("backLink")}
      </Link>
      <Eyebrow className="mt-4">{t("eyebrow")}</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">{t("heading")}</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-6" />

      {/* Progress hero */}
      <div className="bg-royal text-bone p-5 mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
        <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">
          {t("progressLabel")}
        </div>
        <div className="display tabular text-[44px] leading-none mt-2">
          {earned}
          <span className="text-bone/50 text-2xl">/{total}</span>
        </div>
        <div className="text-xs opacity-80 mt-2 tabular">
          {t("bonusPointsEarned", { pts: totalPts.toLocaleString() })}
        </div>
        <div className="mt-4 h-1.5 bg-bone/15 relative overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-sol transition-all"
            style={{ width: total > 0 ? `${(earned / total) * 100}%` : "0%" }}
          />
        </div>
      </div>

      {/* Active perks + credits — only renders when there's something to show. */}
      {(hasAnyPerk || availableCredits.length > 0) && (
        <div className="bg-bone border border-mist p-5 mb-6">
          <Eyebrow>{t("yourPerks")}</Eyebrow>
          <div className="mt-3 space-y-2">
            {(perks?.discount_pct ?? 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span>{t("perkForeverDiscount")}</span>
                <span className="font-mono tabular text-good font-bold">
                  {t("perkDiscountValue", { pct: perks?.discount_pct })}
                </span>
              </div>
            )}
            {perks?.has_lifetime_express_upgrade && (
              <div className="flex justify-between text-sm">
                <span>{t("perkExpressUpgrade")}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-good">
                  {t("perkFreeForLife")}
                </span>
              </div>
            )}
            {perks?.is_founder && (
              <div className="flex justify-between text-sm">
                <span>{t("perkFounder")}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-sol">
                  {t("perkCharterMember")}
                </span>
              </div>
            )}
            {perks?.weekend_priority && (
              <div className="flex justify-between text-sm">
                <span>{t("perkWeekendSlots")}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-good">
                  {t("perkPriorityRouting")}
                </span>
              </div>
            )}
            {availableCredits.map((c: any) => (
              <div key={c.id} className="flex justify-between text-sm pt-2 border-t border-mist">
                <span>
                  {t("creditFree")} <strong>{c.service_tier_name}</strong>
                  <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-smoke">
                    {t("creditFrom", { achievement: c.source_achievement_id?.replace(/_/g, " ") ?? t("creditAchievementFallback") })}
                  </span>
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-good">
                  {t("creditReadyToRedeem")}
                </span>
              </div>
            ))}
          </div>
          {availableCredits.length > 0 && (
            <p className="text-[11px] text-smoke mt-3 leading-relaxed">
              {t("creditApplyHint")}
            </p>
          )}
        </div>
      )}

      {/* Badge grid */}
      <div className="grid grid-cols-2 gap-3">
        {(catalog ?? []).map((a: any) => {
          const unlockedAt = have.get(a.id);
          const isUnlocked = !!unlockedAt;
          return (
            <div
              key={a.id}
              className={`relative p-5 transition border ${
                isUnlocked
                  ? "bg-royal text-bone border-royal"
                  : "bg-mist/30 text-ink border-mist"
              }`}
            >
              {isUnlocked && (
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-sol" />
              )}
              <div
                className={`mb-3 ${
                  isUnlocked ? "text-sol" : "text-smoke"
                }`}
              >
                <AchievementGlyph id={a.id} size={36} />
              </div>
              <div
                className={`font-bold uppercase tracking-wide text-sm leading-tight ${
                  !isUnlocked && "opacity-60"
                }`}
              >
                {a.display_name}
              </div>
              <p
                className={`text-xs mt-1.5 leading-relaxed ${
                  isUnlocked ? "text-bone/80" : "text-smoke/80"
                }`}
              >
                {a.description}
              </p>
              <div
                className={`font-mono text-[10px] uppercase tracking-wider mt-4 ${
                  isUnlocked ? "text-sol" : "text-smoke"
                }`}
              >
                {isUnlocked
                  ? t("badgeUnlockedMeta", {
                      pts: a.bonus_points,
                      date: new Date(unlockedAt!).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      }),
                    })
                  : t("badgeLockedMeta", { pts: a.bonus_points })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

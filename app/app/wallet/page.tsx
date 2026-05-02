import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const t = await getTranslations("appWallet");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Loyalty balance
  const { data: ledger } = await supabase
    .from("loyalty_ledger")
    .select("points, reason, created_at")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(20);
  const balance = (ledger ?? []).reduce((acc, r) => acc + (r.points ?? 0), 0);
  const creditDollars = (balance / 100).toFixed(2);

  // Membership status
  const { data: membership } = await supabase
    .from("memberships")
    .select("status, washes_used, current_period_end, membership_plans(display_name, included_washes)")
    .eq("user_id", user?.id ?? "")
    .in("status", ["active", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Outstanding penalties — customer should know what they owe.
  const { data: penalties } = await supabase
    .from("penalties")
    .select("id, reason, amount_cents, status, notes, created_at")
    .eq("user_id", user?.id ?? "")
    .in("status", ["applied", "pending"])
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="px-5 pt-10 pb-8">
      <Eyebrow>{t("eyebrow")}</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">{t("pageTitle")}</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-6" />

      <div className="bg-royal text-bone p-6 mb-5 relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
        <div className="font-mono text-[10px] uppercase opacity-80">{t("loyaltyBalance")}</div>
        <div className="display tabular text-5xl mt-2">{balance.toLocaleString()}<span className="text-2xl ml-2 opacity-80">{t("pts")}</span></div>
        <div className="text-xs opacity-80 mt-2 tabular">{t("creditApprox", { dollars: creditDollars })}</div>
        <div className="text-[11px] opacity-70 mt-1">{t("earnRate")}</div>
      </div>

      {membership ? (
        <Link href="/app/membership" className="block bg-mist p-5 mb-5 hover:bg-mist/70">
          <div className="flex justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase text-smoke">{t("activeMembership")}</div>
              <div className="display text-2xl mt-1">{(membership as any).membership_plans?.display_name?.toUpperCase()}</div>
              <div className="text-xs text-smoke mt-1">
                {t("washesUsed", { used: membership.washes_used ?? 0, total: (membership as any).membership_plans?.included_washes })}
              </div>
            </div>
            <div className="text-smoke text-2xl">→</div>
          </div>
        </Link>
      ) : (
        <Link href="/app/membership" className="block bg-sol p-5 mb-5 hover:bg-bone">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-mono text-[10px] uppercase">{t("saveWithSheenPlus")}</div>
              <div className="display text-2xl mt-1">{t("joinPlan")}</div>
              <div className="text-xs mt-1">{t("joinPlanDesc")}</div>
            </div>
            <div className="text-2xl">→</div>
          </div>
        </Link>
      )}

      <Link href="/app/me/achievements" className="block bg-mist/40 p-5 mb-5 hover:bg-mist">
        <div className="flex justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase text-smoke">{t("achievementsLabel")}</div>
            <div className="display text-2xl mt-1">{t("yourBadges")}</div>
            <div className="text-xs text-smoke mt-1">{t("achievementsDesc")}</div>
          </div>
          <div className="text-smoke text-2xl">→</div>
        </div>
      </Link>

      {(penalties ?? []).length > 0 && (
        <div className="bg-bad/10 border-l-2 border-bad p-4 mb-5">
          <div className="font-mono text-[10px] uppercase tracking-wider text-bad mb-2">
            {t("outstandingFees")}
          </div>
          <div className="space-y-2">
            {(penalties ?? []).map((p: any) => (
              <div key={p.id} className="flex justify-between items-start text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-medium capitalize">
                    {p.reason.replace(/_/g, " ")}
                  </div>
                  {p.notes && (
                    <div className="text-xs text-smoke truncate">{p.notes}</div>
                  )}
                  <div className="font-mono text-[10px] text-smoke mt-0.5">
                    {new Date(p.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
                <div className="display tabular text-bad">−${(p.amount_cents / 100).toFixed(2)}</div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-smoke mt-3 leading-relaxed">
            {t("penaltyNote")}{" "}
            <a href="mailto:hello@sheen.co" className="underline">hello@sheen.co</a>.
          </div>
        </div>
      )}

      <Eyebrow>{t("pointsHistory")}</Eyebrow>
      <div className="mt-3 space-y-2">
        {(ledger ?? []).map((r, i) => (
          <div key={i} className="bg-mist/40 p-3 flex justify-between text-sm">
            <div>
              <div className="font-medium capitalize">{r.reason.replace(/_|:/g, " ")}</div>
              <div className="text-xs text-smoke font-mono mt-0.5">
                {new Date(r.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
              </div>
            </div>
            <div className={`display tabular ${r.points >= 0 ? "text-good" : "text-bad"}`}>
              {r.points >= 0 ? "+" : ""}
              {r.points} {t("pts")}
            </div>
          </div>
        ))}
        {(ledger ?? []).length === 0 && (
          <div className="bg-mist/40 p-6 text-center text-sm text-smoke">
            {t("noPoints")}
          </div>
        )}
      </div>
    </div>
  );
}

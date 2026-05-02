import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { createClient } from "@/lib/supabase/server";
import { ReferralActions } from "./ReferralActions";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

function codeFor(uid: string) {
  // Short, deterministic, uppercase, easy-to-share. First 6 chars of the
  // user's UUID (no hyphens) — readable & unique enough for v1.
  return uid.replace(/-/g, "").slice(0, 6).toUpperCase();
}

export default async function ReferPage() {
  const t = await getTranslations("appRefer");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const code = user ? codeFor(user.id) : "—";
  const shareUrl = `https://sheen-iota.vercel.app/sign-up?ref=${code}`;

  // Read referral count from loyalty_ledger (entries with reason=referral).
  const { count: referrals } = await supabase
    .from("loyalty_ledger")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", user?.id ?? "")
    .eq("reason", "referral");

  return (
    <div className="px-5 pt-10 pb-8">
      <Link href="/app/me" className="text-sm text-smoke">{t("backLink")}</Link>
      <Eyebrow className="mt-4">{t("eyebrow")}</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">{t("heading")}</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-6" />

      <p className="text-sm text-ink/80 mb-6">
        {t("description")}
      </p>

      <div className="bg-ink text-bone p-6 mb-4">
        <div className="font-mono text-[10px] uppercase tracking-wider text-sol mb-2">
          {t("yourCodeLabel")}
        </div>
        <div className="display text-5xl tracking-wider tabular">{code}</div>
      </div>

      <ReferralActions code={code} shareUrl={shareUrl} />

      <div className="mt-8 grid grid-cols-2 gap-3">
        <div className="bg-mist/40 p-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-smoke">{t("statReferrals")}</div>
          <div className="display text-2xl tabular mt-1">{referrals ?? 0}</div>
        </div>
        <div className="bg-mist/40 p-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-smoke">{t("statEarned")}</div>
          <div className="display text-2xl tabular mt-1">${(referrals ?? 0) * 25}</div>
        </div>
      </div>

      <div className="mt-8 text-xs text-smoke">
        {t("creditPostNote")}
      </div>
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { StripeStep } from "./StripeStep";
import { InsuranceStep } from "./InsuranceStep";
import { BackgroundCheckStep } from "./BackgroundCheckStep";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function VerifyPage() {
  const t = await getTranslations("proVerify");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: wp } = await supabase
    .from("washer_profiles")
    .select(
      "stripe_account_id, insurance_doc_url, insurance_expires_at, background_check_status, background_check_verified, status"
    )
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  return (
    <div className="px-5 pt-10 pb-8">
      <Link href="/pro" className="text-bone/60 text-sm">
        ← {t("backHome")}
      </Link>
      <Eyebrow className="!text-bone/60 mt-4" prefix={null}>
        {t("eyebrow")}
      </Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">{t("headline")}</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-6" />
      <p className="text-sm text-bone/60 mb-7 leading-relaxed">
        {t("subhead")}
      </p>

      <div className="space-y-3">
        <StripeStep connected={!!wp?.stripe_account_id} />
        <InsuranceStep
          docPath={wp?.insurance_doc_url ?? null}
          expiresAt={wp?.insurance_expires_at ?? null}
        />
        <BackgroundCheckStep
          status={wp?.background_check_status ?? "not_submitted"}
          verified={!!wp?.background_check_verified}
        />
      </div>

      <p className="text-[11px] text-bone/40 mt-8 leading-relaxed">
        {t("accountStatusPrefix")}{" "}
        <span
          className={
            wp?.status === "active"
              ? "text-good"
              : wp?.status === "suspended"
              ? "text-bad"
              : "text-sol"
          }
        >
          {wp?.status ?? t("statusPending")}
        </span>
        . {t("accountStatusSuffix")}
      </p>
    </div>
  );
}

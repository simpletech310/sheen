import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { createClient } from "@/lib/supabase/server";
import { RecurringRow } from "./RecurringRow";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function RecurringPage() {
  const t = await getTranslations("appRecurring");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: templates } = await supabase
    .from("recurring_booking_templates")
    .select(
      "id, frequency, preferred_window, next_run_at, active, paused, vehicle_ids, services(tier_name, category, base_price_cents), addresses(street, city, state)"
    )
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  const FREQ_LABEL: Record<string, string> = {
    weekly: t("freqWeekly"),
    biweekly: t("freqBiweekly"),
    monthly: t("freqMonthly"),
  };

  return (
    <div className="px-5 pt-10 pb-8">
      <Link href="/app/me" className="text-sm text-smoke">{t("backLink")}</Link>
      <Eyebrow className="mt-4">{t("eyebrow")}</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">{t("heading")}</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-6" />

      {(templates ?? []).length === 0 ? (
        <div className="bg-mist/40 p-6 text-center text-sm text-smoke">
          <p>{t("emptyTitle")}</p>
          <p className="mt-2">
            {t("emptyDesc")}
          </p>
          <Link
            href="/app/book"
            className="inline-block mt-4 bg-ink text-bone px-5 py-3 text-xs font-bold uppercase tracking-wide hover:bg-royal transition"
          >
            {t("bookCta")}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {(templates ?? []).map((t: any) => (
            <RecurringRow
              key={t.id}
              id={t.id}
              tier={t.services?.tier_name ?? "Wash"}
              category={t.services?.category ?? "auto"}
              perVehiclePrice={t.services?.base_price_cents ?? 0}
              vehicleCount={t.vehicle_ids?.length ?? 1}
              cadence={FREQ_LABEL[t.frequency] ?? t.frequency}
              window={t.preferred_window}
              nextRunAt={t.next_run_at}
              addressLine={
                t.addresses
                  ? `${t.addresses.street}, ${t.addresses.city}, ${t.addresses.state}`
                  : null
              }
              paused={!!t.paused}
            />
          ))}
        </div>
      )}

      <p className="text-[11px] text-smoke mt-6 leading-relaxed">
        {t("autoCreateNote")}
      </p>
    </div>
  );
}

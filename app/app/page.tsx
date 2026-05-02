import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";
import { NextWashHero } from "@/components/customer/NextWashHero";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = ["pending", "matched", "en_route", "arrived", "in_progress"];

export default async function CustomerHome() {
  const t = await getTranslations("appMe");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const firstName = (profile?.full_name ?? user?.email ?? "there")
    .split(" ")[0]
    ?.split("@")[0];

  // Hero strip wash counter — counts every booking the customer has on the
  // books that hasn't been cancelled or disputed. Includes upcoming/active
  // bookings so the freshly-created booking immediately bumps the number,
  // instead of staying at 0 until the wash is completed weeks later.
  const { count: washCount } = await supabase
    .from("bookings")
    .select("id", { head: true, count: "exact" })
    .eq("customer_id", user?.id ?? "")
    .not("status", "in", "(cancelled,disputed)");

  // Upcoming / in-flight booking — earliest scheduled active row.
  const { data: nextBookings } = await supabase
    .from("bookings")
    .select(
      "id, status, scheduled_window_start, total_cents, vehicle_count, assigned_washer_id, services(tier_name, category), addresses(street, city, state)"
    )
    .eq("customer_id", user?.id ?? "")
    .in("status", ACTIVE_STATUSES)
    .order("scheduled_window_start", { ascending: true })
    .limit(1);
  const next: any = nextBookings?.[0] ?? null;

  // If we have a pro on it, fetch their identity in one shot. Display
  // name + avatar come from the public users row; rating from the
  // washer profile rollup.
  let proName: string | null = null;
  let proAvatarUrl: string | null = null;
  let proRating: number | null = null;
  if (next?.assigned_washer_id) {
    const [{ data: u }, { data: wp }] = await Promise.all([
      supabase
        .from("users")
        .select("full_name, display_name, avatar_url")
        .eq("id", next.assigned_washer_id)
        .maybeSingle(),
      supabase
        .from("washer_profiles")
        .select("rating_avg")
        .eq("user_id", next.assigned_washer_id)
        .maybeSingle(),
    ]);
    proName = (u as any)?.display_name ?? u?.full_name ?? null;
    proAvatarUrl = (u as any)?.avatar_url
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/avatars/${(u as any).avatar_url}`
      : null;
    proRating = wp?.rating_avg ? Number(wp.rating_avg) : null;
  }

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
            {t("hiName", { name: firstName })}
          </Eyebrow>
          <h1 className="display text-[36px] leading-[0.95] mt-4">
            {next ? (
              <>
                {t("heroNextLine1")}
                <br />
                <span className="text-sol">{t("heroNextLine2")}</span>
              </>
            ) : (
              <>
                {t("heroIdleLine1")}
                <br />
                <span className="text-sol">{t("heroIdleLine2")}</span>
              </>
            )}
          </h1>
          <div className="mt-5 flex gap-6 text-xs">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">
                {t("statWashes")}
              </div>
              <div className="display tabular text-xl mt-0.5">{washCount ?? 0}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">
                {t("statStatus")}
              </div>
              <div className="display tabular text-xl mt-0.5">
                {next ? t("statusActive") : t("statusReady")}
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-sol" />
      </div>

      <div className="px-5 pt-5 pb-8">
        {/* Next-wash hero — only when we have an active booking */}
        {next && (
          <div className="mb-7">
            <NextWashHero
              bookingId={next.id}
              status={next.status}
              tierName={next.services?.tier_name ?? "Wash"}
              category={(next.services?.category ?? "auto") as any}
              scheduledAt={next.scheduled_window_start}
              addressLine={
                next.addresses
                  ? `${next.addresses.street}, ${next.addresses.city}, ${next.addresses.state}`
                  : null
              }
              proName={proName}
              proInitial={proName ? proName[0]?.toUpperCase() ?? null : null}
              proAvatarUrl={proAvatarUrl}
              proRating={proRating}
              vehicleCount={next.vehicle_count ?? 1}
              total={fmtUSD(next.total_cents)}
            />
          </div>
        )}

        <Eyebrow>{next ? t("bookAnother") : t("pickService")}</Eyebrow>
        <div className="mt-3 space-y-3">
          <Link
            href="/app/book/auto"
            className="block bg-bone border border-mist hover:border-ink p-5 transition group"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="display text-2xl group-hover:text-royal transition">{t("categoryAuto")}</div>
                <div className="text-xs text-smoke mt-1">{t("categoryAutoDesc")}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] text-smoke uppercase">{t("from")}</div>
                <div className="display tabular text-xl">$35</div>
              </div>
            </div>
            <div className="mt-4 h-[2px] w-12 bg-gradient-to-r from-royal to-sol opacity-0 group-hover:opacity-100 transition" />
          </Link>

          <Link
            href="/app/book/home"
            className="block bg-bone border border-mist hover:border-ink p-5 transition group"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="display text-2xl group-hover:text-royal transition">{t("categoryHome")}</div>
                <div className="text-xs text-smoke mt-1">{t("categoryHomeDesc")}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] text-smoke uppercase">{t("from")}</div>
                <div className="display tabular text-xl">$95</div>
              </div>
            </div>
            <div className="mt-4 h-[2px] w-12 bg-gradient-to-r from-royal to-sol opacity-0 group-hover:opacity-100 transition" />
          </Link>

          <Link
            href="/app/book/big-rig"
            className="block bg-bone border border-mist hover:border-ink p-5 transition group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 bg-sol text-ink font-mono text-[9px] uppercase tracking-wider px-2 py-0.5">
              {t("badgeNew")}
            </div>
            <div className="flex justify-between items-start">
              <div>
                <div className="display text-2xl group-hover:text-royal transition">{t("categoryBigRig")}</div>
                <div className="text-xs text-smoke mt-1">{t("categoryBigRigDesc")}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] text-smoke uppercase">{t("from")}</div>
                <div className="display tabular text-xl">$145</div>
              </div>
            </div>
            <div className="mt-4 h-[2px] w-12 bg-gradient-to-r from-royal to-sol opacity-0 group-hover:opacity-100 transition" />
          </Link>

          <Link
            href="/app/book/commercial"
            className="block bg-bone border border-mist hover:border-ink p-5 transition group"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="display text-2xl group-hover:text-royal transition">
                  {t("categoryCommercial")}
                </div>
                <div className="text-xs text-smoke mt-1">
                  {t("categoryCommercialDesc")}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] text-smoke uppercase">{t("quoted")}</div>
                <div className="display text-xl">→</div>
              </div>
            </div>
            <div className="mt-4 h-[2px] w-12 bg-gradient-to-r from-royal to-sol opacity-0 group-hover:opacity-100 transition" />
          </Link>
        </div>

      </div>
    </>
  );
}

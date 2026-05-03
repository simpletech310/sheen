import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";
import { computeFees } from "@/lib/stripe/fees";
import { ClaimButton } from "./ClaimButton";
import { RequestActions } from "./RequestActions";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { BookingVehicleList } from "@/components/customer/BookingVehicleList";
import { signedUrls } from "@/lib/storage";
import { checkWasherEligibility } from "@/lib/job-matching";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

// Equipment fields displayed to the washer alongside the "what you need" badges.
const REQUIREMENT_LABELS: Array<[
  keyof import("@/lib/job-matching").ServiceRequirements,
  keyof import("@/lib/job-matching").WasherCapabilities,
  string
]> = [
  ["requires_pressure_washer", "has_pressure_washer", "Pressure washer"],
  ["requires_paint_correction", "can_do_paint_correction", "Paint correction kit"],
  ["requires_interior_detail", "can_detail_interior", "Interior detailing"],
];

export default async function JobDetailPage({ params }: { params: { jobId: string } }) {
  const t = await getTranslations("proQueue");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: job } = await supabase
    .from("bookings")
    .select(
      "id, status, assigned_washer_id, customer_id, requested_washer_id, request_expires_at, request_declined_at, scheduled_window_start, scheduled_window_end, service_cents, customer_note, services(id, tier_name, duration_minutes, included, category, requires_water, requires_power, requires_pressure_washer, requires_paint_correction, requires_interior_detail), addresses(street, city, state, zip, notes, has_water, has_power, water_notes, power_notes, gate_code, site_photo_paths), users:customer_id(full_name), booking_addons(addon_code, addon_name, price_cents, washer_payout_cents, duration_minutes, size_multiplier, booking_vehicle_id)"
    )
    .eq("id", params.jobId)
    .maybeSingle();

  if (!job) notFound();
  const fees = computeFees({ serviceCents: (job as any).service_cents, routedTo: "solo_washer" });
  const claimed = !!job.assigned_washer_id;
  const mine = job.assigned_washer_id === user?.id;

  // Direct-request state for this washer.
  const isDirectRequest =
    !!user &&
    (job as any).requested_washer_id === user.id &&
    (job as any).request_expires_at &&
    new Date((job as any).request_expires_at).getTime() > Date.now() &&
    !(job as any).request_declined_at &&
    !claimed;
  const requestExpiresAtIso = isDirectRequest ? (job as any).request_expires_at : null;

  // Vehicles + condition photos. Pros see this before AND after claiming so
  // they can decide whether to take a job that includes 3 SUVs vs 1 sedan.
  const { data: bvRows } = await supabase
    .from("booking_vehicles")
    .select(
      "id, vehicle_id, condition_photo_paths, vehicles(year, make, model, color, plate, notes, photo_paths)"
    )
    .eq("booking_id", params.jobId);
  const conditionPhotoPaths = (bvRows ?? []).flatMap(
    (r: any) => r.condition_photo_paths ?? []
  );
  const garagePhotoPaths = (bvRows ?? []).flatMap(
    (r: any) => r.vehicles?.photo_paths ?? []
  );

  // Pull the service's checklist + the washer's own caps so we can render
  // a "what you'll do" preview and a personalised eligibility badge before
  // they commit. Site photos live in the same bucket so we batch-sign.
  const sitePhotoPaths: string[] = (job as any).addresses?.site_photo_paths ?? [];
  const allPhotoUrls = await signedUrls("booking-photos", [
    ...conditionPhotoPaths,
    ...garagePhotoPaths,
    ...sitePhotoPaths,
  ]);
  const photoUrls = Object.fromEntries(
    [...conditionPhotoPaths, ...garagePhotoPaths]
      .map((p: string) => [p, allPhotoUrls[p]] as const)
      .filter(([, u]) => !!u)
  );
  const sitePhotoUrls = sitePhotoPaths
    .map((p) => allPhotoUrls[p])
    .filter((u): u is string => !!u);

  const [{ data: checklistItems }, { data: washerProfile }] = await Promise.all([
    supabase
      .from("service_checklist_items")
      .select("id, label, hint, requires_photo, sort_order")
      .eq("service_id", (job as any).services?.id ?? "")
      .order("sort_order"),
    user
      ? supabase
          .from("washer_profiles")
          .select(
            "has_own_water, has_own_power, has_pressure_washer, can_detail_interior, can_do_paint_correction, can_wash_big_rig, tier, capabilities"
          )
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null } as any),
  ]);

  const addonRows: Array<{
    addon_code: string;
    addon_name: string;
    price_cents: number;
    washer_payout_cents: number;
    duration_minutes: number;
    size_multiplier: number;
    booking_vehicle_id: string | null;
  }> = (job as any).booking_addons ?? [];

  const eligibility = checkWasherEligibility(
    (job as any).services,
    (job as any).addresses,
    washerProfile as any,
    addonRows.map((a) => a.addon_code)
  );

  const addr = (job as any).addresses ?? {};
  const svc = (job as any).services ?? {};

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/pro/queue" className="text-bone/75 text-sm">
          ← {t("backToQueue")}
        </Link>
      </div>
      <Eyebrow className="!text-bone/60" prefix={null}>
        {t("jobEyebrow", { id: job.id.slice(0, 8) })}
      </Eyebrow>
      <div className="flex items-center gap-2 mt-3 mb-2">
        {(() => {
          const category = (job as any).services?.category ?? "auto";
          const isHome = category === "home";
          return (
            <span
              className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 ${
                isHome ? "bg-sol text-ink" : "bg-royal text-bone"
              }`}
            >
              {isHome ? t("categoryHome") : t("categoryAuto")}
            </span>
          );
        })()}
      </div>
      <h1 className="display text-3xl mb-2">{(job as any).services?.tier_name ?? t("service")}</h1>
      <div className="font-mono text-[11px] text-bone/90 uppercase">
        {new Date((job as any).scheduled_window_start).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
      </div>

      <div className="mt-6 bg-white/5 p-5">
        <div className="flex justify-between items-baseline">
          <div>
            <div className="display tabular text-3xl text-cobalt">{fmtUSD(fees.washerOrPartnerNet)}</div>
            <div className="font-mono text-[10px] text-bone/75 mt-1">{t("youGet")}</div>
          </div>
          <div className="text-right text-xs text-bone/85">
            <div className="tabular">{t("gross")} {fmtUSD(fees.serviceCents)}</div>
            <div className="tabular">{t("commission")}</div>
          </div>
        </div>
      </div>

      {/* Address visibility — hidden once the booking is funded so the
          customer's home isn't sitting in the washer's history forever.
          Pre-fund (claim, navigate, in-progress, complete-pending-approval)
          the washer needs the address; once funds release we drop it to
          city + state only. */}
      <div className="mt-5">
        <Eyebrow className="!text-bone/60" prefix={null}>
          {job.status === "funded" ? t("serviceArea") : t("address")}
        </Eyebrow>
        {job.status === "funded" ? (
          <div className="mt-2 text-sm text-bone/85">
            {(job as any).addresses?.city}, {(job as any).addresses?.state}
            <div className="text-xs text-bone/55 mt-1">
              {t("addressRemovedNote")}
            </div>
          </div>
        ) : (
          <>
            <div className="mt-2 text-sm">
              {(job as any).addresses?.street}, {(job as any).addresses?.city}, {(job as any).addresses?.state}{" "}
              {(job as any).addresses?.zip}
            </div>
            {(job as any).addresses?.notes && (
              <div className="text-xs text-bone/85 mt-1">{(job as any).addresses.notes}</div>
            )}
          </>
        )}
      </div>

      {addonRows.length > 0 && (() => {
        // Group add-ons by booking_vehicle_id so the pro sees exactly
        // which add-ons go on which car. Honda gets ceramic + wax,
        // Dodge gets nothing — no guesswork on the job site.
        const addonsByBV = new Map<string, typeof addonRows>();
        const orphans: typeof addonRows = [];
        for (const a of addonRows) {
          if (a.booking_vehicle_id) {
            const list = addonsByBV.get(a.booking_vehicle_id) ?? [];
            list.push(a);
            addonsByBV.set(a.booking_vehicle_id, list);
          } else {
            orphans.push(a);
          }
        }
        return (
          <div className="mt-5">
            <Eyebrow className="!text-bone/60" prefix={null}>
              {t("addonsBreakdown", { count: addonRows.length })}
            </Eyebrow>
            <div className="mt-2 space-y-2">
              {(bvRows ?? []).map((r: any) => {
                const v = r.vehicles ?? {};
                const label = [v.year, v.color, v.make, v.model].filter(Boolean).join(" ");
                const list = addonsByBV.get(r.id) ?? [];
                if (list.length === 0) return null;
                return (
                  <div key={r.id} className="bg-white/5 p-3">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-sol mb-2">
                      → {label || "Vehicle"}
                      {v.plate ? <span className="ml-1 opacity-60">· {v.plate}</span> : null}
                    </div>
                    <div className="space-y-1.5">
                      {list.map((a) => (
                        <div key={a.addon_code} className="flex justify-between items-baseline text-xs">
                          <div className="flex-1 min-w-0">
                            <span className="text-bone/90">{a.addon_name}</span>
                            <span className="ml-2 font-mono text-[10px] text-bone/50 uppercase tracking-wider">
                              {a.duration_minutes}m
                              {a.size_multiplier !== 1 && (
                                <> · {a.size_multiplier.toFixed(2)}×</>
                              )}
                            </span>
                          </div>
                          <div className="text-sol font-mono text-[11px] tabular shrink-0">
                            +{fmtUSD(a.washer_payout_cents)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {orphans.length > 0 && (
                <div className="bg-white/5 p-3">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-bone/60 mb-2">
                    {t("addonsApplyToBooking")}
                  </div>
                  <div className="space-y-1.5">
                    {orphans.map((a) => (
                      <div key={a.addon_code} className="flex justify-between items-baseline text-xs">
                        <div className="flex-1 min-w-0">
                          <span className="text-bone/90">{a.addon_name}</span>
                          <span className="ml-2 font-mono text-[10px] text-bone/50 uppercase tracking-wider">
                            {a.duration_minutes}m
                          </span>
                        </div>
                        <div className="text-sol font-mono text-[11px] tabular shrink-0">
                          +{fmtUSD(a.washer_payout_cents)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {(job as any).customer_note && (
        <div className="mt-5">
          <Eyebrow className="!text-bone/60" prefix={null}>
            {t("customerNote")}
          </Eyebrow>
          <div className="mt-2 text-sm bg-white/5 p-3">{(job as any).customer_note}</div>
        </div>
      )}

      {(bvRows ?? []).length > 0 && (
        <div className="mt-5">
          <Eyebrow className="!text-bone/60" prefix={null}>
            {bvRows!.length === 1 ? t("vehicle") : t("vehicles_count", { count: bvRows!.length })}
          </Eyebrow>
          <div className="mt-2">
            <BookingVehicleList rows={(bvRows ?? []) as any} signedPhotoUrls={photoUrls} dark />
          </div>
        </div>
      )}

      {/* Site access — what's on the property + how to get in. The customer
          captured this at booking time; if they didn't, fall back to the free
          notes field rather than show empty rows. Site details (gate code
          especially) get scrubbed once the job is funded. */}
      {job.status !== "funded" && (
      <div className="mt-5">
        <Eyebrow className="!text-bone/60" prefix={null}>
          {t("siteAccess")}
        </Eyebrow>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <SiteFlag
            label={t("water")}
            on={addr.has_water === true}
            off={addr.has_water === false}
            note={addr.water_notes}
            onSiteLabel={t("onSite")}
            bringYourOwnLabel={t("bringYourOwn")}
            notSpecifiedLabel={t("notSpecified")}
          />
          <SiteFlag
            label={t("power")}
            on={addr.has_power === true}
            off={addr.has_power === false}
            note={addr.power_notes}
            onSiteLabel={t("onSite")}
            bringYourOwnLabel={t("bringYourOwn")}
            notSpecifiedLabel={t("notSpecified")}
          />
        </div>
        {addr.gate_code && (
          <div className="mt-2 bg-sol/10 border-l-2 border-sol px-3 py-2 text-xs">
            <span className="font-mono uppercase tracking-wider text-sol">{t("gateCode")}</span>{" "}
            <span className="font-mono font-bold tabular ml-1">{addr.gate_code}</span>
          </div>
        )}
        {sitePhotoUrls.length > 0 && (
          <div className="mt-2 flex gap-2">
            {sitePhotoUrls.map((u) => (
              <a
                key={u}
                href={u}
                target="_blank"
                rel="noreferrer"
                className="block w-16 h-16 bg-white/5 overflow-hidden"
                aria-label={t("sitePhoto")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" className="w-full h-full object-cover" loading="lazy" />
              </a>
            ))}
          </div>
        )}
      </div>
      )}

      {/* What you need to bring. Each row says whether the *current* washer
          has it — the eligibility check above already decided whether they
          can claim, but seeing the gap explicitly is what they want. */}
      {(svc.requires_pressure_washer ||
        svc.requires_paint_correction ||
        svc.requires_interior_detail ||
        (svc.requires_water && addr.has_water === false) ||
        (svc.requires_power && addr.has_power === false)) && (
        <div className="mt-5">
          <Eyebrow className="!text-bone/60" prefix={null}>
            {t("whatYouNeed")}
          </Eyebrow>
          <div className="mt-2 space-y-1.5 text-sm">
            {REQUIREMENT_LABELS.filter(([flag]) => svc[flag]).map(([, capKey, label]) => {
              const has = !!(washerProfile as any)?.[capKey];
              return (
                <RequirementRow
                  key={label}
                  label={label}
                  ok={has}
                  youHaveIt={t("youHaveIt")}
                  youDontHaveIt={t("youDontHaveIt")}
                />
              );
            })}
            {svc.requires_water && addr.has_water === false && (
              <RequirementRow
                label={t("byoWater")}
                ok={!!(washerProfile as any)?.has_own_water}
                youHaveIt={t("youHaveIt")}
                youDontHaveIt={t("youDontHaveIt")}
              />
            )}
            {svc.requires_power && addr.has_power === false && (
              <RequirementRow
                label={t("byoPower")}
                ok={!!(washerProfile as any)?.has_own_power}
                youHaveIt={t("youHaveIt")}
                youDontHaveIt={t("youDontHaveIt")}
              />
            )}
          </div>
          {!eligibility.ok && (
            <div className="mt-3 bg-bad/15 border-l-2 border-bad px-3 py-2 text-xs text-bone">
              {t("notEligibleNote", { reasons: eligibility.reasons.join(" · ") })}
              {" "}
              {t("updateEquipmentPrefix")}{" "}
              <Link href="/pro/me/edit" className="underline">{t("yourProfile")}</Link>{" "}
              {t("updateEquipmentSuffix")}
            </div>
          )}
        </div>
      )}

      {/* Full checklist preview so the washer sees exactly what they're
          signing up to do before they accept. Read-only — pros tick this off
          on the job's /checklist page during the wash. */}
      {(checklistItems ?? []).length > 0 && (
        <div className="mt-5">
          <Eyebrow className="!text-bone/60" prefix={null}>
            {t("whatYoullDo", { count: (checklistItems ?? []).length })}
          </Eyebrow>
          <ol className="mt-2 space-y-1.5 text-sm">
            {(checklistItems ?? []).map((it: any, i: number) => (
              <li key={it.id} className="flex items-start gap-2 leading-tight">
                <span className="shrink-0 font-mono text-[10px] text-bone/50 mt-0.5 w-5 tabular text-right">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 text-bone/85">
                  {it.label}
                  {it.requires_photo && (
                    <span className="ml-2 font-mono text-[9px] uppercase tracking-wider text-sol">
                      {t("photo")}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-7">
        {isDirectRequest && requestExpiresAtIso && (
          <RequestActions jobId={job.id} expiresAtIso={requestExpiresAtIso} />
        )}
        {!isDirectRequest && !claimed && (
          eligibility.ok ? (
            <ClaimButton jobId={job.id} />
          ) : (
            <button
              disabled
              className="block w-full text-center bg-white/10 text-bone/40 rounded-full py-4 text-sm font-semibold cursor-not-allowed"
              aria-disabled
            >
              {t("notEligible")}
            </button>
          )
        )}
        {mine && (
          <Link
            href={`/pro/jobs/${job.id}/navigate`}
            className="block w-full text-center bg-cobalt text-bone rounded-full py-4 text-sm font-semibold"
          >
            {t("navigate")} →
          </Link>
        )}
        {claimed && !mine && (
          <div className="text-center text-bone/80 text-sm py-4">{t("claimedByOther")}</div>
        )}
      </div>

      {mine && user && (
        <ChatPanel
          bookingId={job.id}
          currentUserId={user.id}
          otherName={(job as any).users?.full_name ?? t("theCustomer")}
          variant="pro"
        />
      )}
    </div>
  );
}

function SiteFlag({
  label,
  on,
  off,
  note,
  onSiteLabel,
  bringYourOwnLabel,
  notSpecifiedLabel,
}: {
  label: string;
  on: boolean;
  off: boolean;
  note?: string | null;
  onSiteLabel: string;
  bringYourOwnLabel: string;
  notSpecifiedLabel: string;
}) {
  // Three states: on-site (green), not on-site (amber — BYO), unknown (grey).
  const tone = on
    ? "bg-good/15 border-good"
    : off
    ? "bg-sol/15 border-sol"
    : "bg-white/5 border-bone/15";
  const status = on ? onSiteLabel : off ? bringYourOwnLabel : notSpecifiedLabel;
  return (
    <div className={`p-3 border-l-2 ${tone}`}>
      <div className="font-mono text-[10px] uppercase tracking-wider text-bone/70">
        {label}
      </div>
      <div className="text-sm font-bold mt-0.5">{status}</div>
      {note && <div className="text-[11px] text-bone/70 mt-1 leading-snug">{note}</div>}
    </div>
  );
}

function RequirementRow({
  label,
  ok,
  youHaveIt,
  youDontHaveIt,
}: {
  label: string;
  ok: boolean;
  youHaveIt: string;
  youDontHaveIt: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`shrink-0 inline-flex items-center justify-center w-4 h-4 text-[10px] ${
          ok ? "bg-good text-ink" : "bg-bad text-bone"
        }`}
      >
        {ok ? "✓" : "✗"}
      </span>
      <span className={ok ? "text-bone" : "text-bone/70"}>{label}</span>
      <span className={`ml-auto font-mono text-[9px] uppercase tracking-wider ${ok ? "text-good" : "text-bad"}`}>
        {ok ? youHaveIt : youDontHaveIt}
      </span>
    </div>
  );
}

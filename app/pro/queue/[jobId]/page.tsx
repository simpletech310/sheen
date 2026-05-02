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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: job } = await supabase
    .from("bookings")
    .select(
      "id, status, assigned_washer_id, customer_id, requested_washer_id, request_expires_at, request_declined_at, scheduled_window_start, scheduled_window_end, service_cents, customer_note, services(id, tier_name, duration_minutes, included, category, requires_water, requires_power, requires_pressure_washer, requires_paint_correction, requires_interior_detail), addresses(street, city, state, zip, notes, has_water, has_power, water_notes, power_notes, gate_code, site_photo_paths), users:customer_id(full_name)"
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
      "vehicle_id, condition_photo_paths, vehicles(year, make, model, color, plate, notes, photo_paths)"
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
            "has_own_water, has_own_power, has_pressure_washer, can_detail_interior, can_do_paint_correction, can_wash_big_rig"
          )
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null } as any),
  ]);

  const eligibility = checkWasherEligibility(
    (job as any).services,
    (job as any).addresses,
    washerProfile as any
  );

  const addr = (job as any).addresses ?? {};
  const svc = (job as any).services ?? {};

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/pro/queue" className="text-bone/75 text-sm">
          ← Queue
        </Link>
      </div>
      <Eyebrow className="!text-bone/60" prefix={null}>
        Job · #{job.id.slice(0, 8)}
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
              {isHome ? "Home" : "Auto"}
            </span>
          );
        })()}
      </div>
      <h1 className="display text-3xl mb-2">{(job as any).services?.tier_name ?? "Service"}</h1>
      <div className="font-mono text-[11px] text-bone/90 uppercase">
        {new Date((job as any).scheduled_window_start).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
      </div>

      <div className="mt-6 bg-white/5 p-5">
        <div className="flex justify-between items-baseline">
          <div>
            <div className="display tabular text-3xl text-cobalt">{fmtUSD(fees.washerOrPartnerNet)}</div>
            <div className="font-mono text-[10px] text-bone/75 mt-1">YOU GET</div>
          </div>
          <div className="text-right text-xs text-bone/85">
            <div className="tabular">Gross {fmtUSD(fees.serviceCents)}</div>
            <div className="tabular">−22% commission</div>
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
          {job.status === "funded" ? "Service area" : "Address"}
        </Eyebrow>
        {job.status === "funded" ? (
          <div className="mt-2 text-sm text-bone/85">
            {(job as any).addresses?.city}, {(job as any).addresses?.state}
            <div className="text-xs text-bone/55 mt-1">
              Address removed after the wash funded — your customer&rsquo;s privacy stays protected once the job is done.
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

      {(job as any).customer_note && (
        <div className="mt-5">
          <Eyebrow className="!text-bone/60" prefix={null}>
            Customer note
          </Eyebrow>
          <div className="mt-2 text-sm bg-white/5 p-3">{(job as any).customer_note}</div>
        </div>
      )}

      {(bvRows ?? []).length > 0 && (
        <div className="mt-5">
          <Eyebrow className="!text-bone/60" prefix={null}>
            {bvRows!.length === 1 ? "Vehicle" : `Vehicles · ${bvRows!.length}`}
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
          Site access
        </Eyebrow>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <SiteFlag
            label="Water"
            on={addr.has_water === true}
            off={addr.has_water === false}
            note={addr.water_notes}
          />
          <SiteFlag
            label="Power"
            on={addr.has_power === true}
            off={addr.has_power === false}
            note={addr.power_notes}
          />
        </div>
        {addr.gate_code && (
          <div className="mt-2 bg-sol/10 border-l-2 border-sol px-3 py-2 text-xs">
            <span className="font-mono uppercase tracking-wider text-sol">Gate code</span>{" "}
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
                aria-label="Site photo"
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
            What you&rsquo;ll need
          </Eyebrow>
          <div className="mt-2 space-y-1.5 text-sm">
            {REQUIREMENT_LABELS.filter(([flag]) => svc[flag]).map(([, capKey, label]) => {
              const has = !!(washerProfile as any)?.[capKey];
              return (
                <RequirementRow key={label} label={label} ok={has} />
              );
            })}
            {svc.requires_water && addr.has_water === false && (
              <RequirementRow
                label="BYO water (no spigot on-site)"
                ok={!!(washerProfile as any)?.has_own_water}
              />
            )}
            {svc.requires_power && addr.has_power === false && (
              <RequirementRow
                label="BYO power (no outlet on-site)"
                ok={!!(washerProfile as any)?.has_own_power}
              />
            )}
          </div>
          {!eligibility.ok && (
            <div className="mt-3 bg-bad/15 border-l-2 border-bad px-3 py-2 text-xs text-bone">
              Can&rsquo;t take this job — {eligibility.reasons.join(" · ")}.
              Update equipment in <Link href="/pro/me/edit" className="underline">your profile</Link> if that changes.
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
            What you&rsquo;ll do · {(checklistItems ?? []).length} steps
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
                      photo
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
              Not eligible
            </button>
          )
        )}
        {mine && (
          <Link
            href={`/pro/jobs/${job.id}/navigate`}
            className="block w-full text-center bg-cobalt text-bone rounded-full py-4 text-sm font-semibold"
          >
            Navigate →
          </Link>
        )}
        {claimed && !mine && (
          <div className="text-center text-bone/80 text-sm py-4">Claimed by another washer</div>
        )}
      </div>

      {mine && user && (
        <ChatPanel
          bookingId={job.id}
          currentUserId={user.id}
          otherName={(job as any).users?.full_name ?? "the customer"}
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
}: {
  label: string;
  on: boolean;
  off: boolean;
  note?: string | null;
}) {
  // Three states: on-site (green), not on-site (amber — BYO), unknown (grey).
  const tone = on
    ? "bg-good/15 border-good"
    : off
    ? "bg-sol/15 border-sol"
    : "bg-white/5 border-bone/15";
  const status = on ? "On-site" : off ? "Bring your own" : "Not specified";
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

function RequirementRow({ label, ok }: { label: string; ok: boolean }) {
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
        {ok ? "you have it" : "you don't"}
      </span>
    </div>
  );
}

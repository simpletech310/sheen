import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";
import { computeFees } from "@/lib/stripe/fees";
import { ClaimButton } from "./ClaimButton";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { BookingVehicleList } from "@/components/customer/BookingVehicleList";
import { signedUrls } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({ params }: { params: { jobId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: job } = await supabase
    .from("bookings")
    .select(
      "id, status, assigned_washer_id, customer_id, scheduled_window_start, scheduled_window_end, service_cents, customer_note, services(tier_name, duration_minutes, included), addresses(street, city, state, zip, notes), users:customer_id(full_name)"
    )
    .eq("id", params.jobId)
    .maybeSingle();

  if (!job) notFound();
  const fees = computeFees({ serviceCents: (job as any).service_cents, routedTo: "solo_washer" });
  const claimed = !!job.assigned_washer_id;
  const mine = job.assigned_washer_id === user?.id;

  // Vehicles + condition photos. Pros see this before AND after claiming so
  // they can decide whether to take a job that includes 3 SUVs vs 1 sedan.
  const { data: bvRows } = await supabase
    .from("booking_vehicles")
    .select(
      "vehicle_id, condition_photo_paths, vehicles(year, make, model, color, plate, notes)"
    )
    .eq("booking_id", params.jobId);
  const photoPaths = (bvRows ?? []).flatMap((r: any) => r.condition_photo_paths ?? []);
  const photoUrls = await signedUrls("booking-photos", photoPaths);

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/pro/queue" className="text-bone/50 text-sm">
          ← Queue
        </Link>
      </div>
      <Eyebrow className="!text-bone/60" prefix={null}>
        Job · #{job.id.slice(0, 8)}
      </Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">{(job as any).services?.tier_name ?? "Service"}</h1>
      <div className="font-mono text-[11px] text-bone/60 uppercase">
        {new Date((job as any).scheduled_window_start).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
      </div>

      <div className="mt-6 bg-white/5 p-5">
        <div className="flex justify-between items-baseline">
          <div>
            <div className="display tabular text-3xl text-cobalt">{fmtUSD(fees.washerOrPartnerNet)}</div>
            <div className="font-mono text-[10px] text-bone/60 mt-1">YOU GET</div>
          </div>
          <div className="text-right text-xs text-bone/60">
            <div className="tabular">Gross {fmtUSD(fees.serviceCents)}</div>
            <div className="tabular">−22% commission</div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <Eyebrow className="!text-bone/60" prefix={null}>
          Address
        </Eyebrow>
        <div className="mt-2 text-sm">
          {(job as any).addresses?.street}, {(job as any).addresses?.city}, {(job as any).addresses?.state}{" "}
          {(job as any).addresses?.zip}
        </div>
        {(job as any).addresses?.notes && (
          <div className="text-xs text-bone/60 mt-1">{(job as any).addresses.notes}</div>
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

      <div className="mt-7">
        {!claimed && <ClaimButton jobId={job.id} />}
        {mine && (
          <Link
            href={`/pro/jobs/${job.id}/navigate`}
            className="block w-full text-center bg-cobalt text-bone rounded-full py-4 text-sm font-semibold"
          >
            Navigate →
          </Link>
        )}
        {claimed && !mine && (
          <div className="text-center text-bone/60 text-sm py-4">Claimed by another washer</div>
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

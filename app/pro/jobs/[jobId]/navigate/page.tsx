import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { NavigateClient } from "./NavigateClient";
import { StatusButtons } from "./StatusButtons";
import { IssueFlagButton } from "@/components/pro/IssueFlagButton";

export default async function NavigatePage({ params }: { params: { jobId: string } }) {
  const supabase = createClient();
  const { data: job } = await supabase
    .from("bookings")
    .select("id, addresses(street, city, state, zip, lat, lng), services(tier_name)")
    .eq("id", params.jobId)
    .maybeSingle();
  if (!job) notFound();

  const addr = (job as any).addresses;
  const fullAddress = addr ? encodeURIComponent(`${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}`) : "";

  return (
    <div className="px-5 pt-10 pb-8">
      <Eyebrow className="!text-bone/60" prefix={null}>
        Navigate
      </Eyebrow>
      <h1 className="display text-3xl mt-3 mb-3">{(job as any).services?.tier_name ?? "Job"}</h1>

      <NavigateClient
        jobId={job.id}
        destination={{
          lat: addr?.lat ? Number(addr.lat) : 34.0522,
          lng: addr?.lng ? Number(addr.lng) : -118.2437,
        }}
      />

      <div className="bg-white/5 p-4 mb-5">
        <div className="text-sm font-bold">{addr?.street}</div>
        <div className="text-xs text-bone/85 mt-0.5">
          {addr?.city}, {addr?.state} {addr?.zip}
        </div>
      </div>

      <StatusButtons
        jobId={job.id}
        mapsUrl={`https://maps.apple.com/?daddr=${fullAddress}`}
      />

      <IssueFlagButton jobId={job.id} />
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";

export default async function NavigatePage({ params }: { params: { jobId: string } }) {
  const supabase = createClient();
  const { data: job } = await supabase
    .from("bookings")
    .select("id, addresses(street, city, state, zip), services(tier_name)")
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

      <div className="bg-cobalt/20 h-72 mb-5 flex items-center justify-center text-cobalt text-xs font-mono uppercase">
        ▢ Live route (Mapbox stub)
      </div>

      <div className="bg-white/5 p-4 mb-5">
        <div className="text-sm font-semibold">{addr?.street}</div>
        <div className="text-xs text-bone/60">
          {addr?.city}, {addr?.state} {addr?.zip}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <a
          href={`https://maps.apple.com/?daddr=${fullAddress}`}
          className="bg-bone text-ink rounded-full py-3 text-sm font-semibold text-center"
        >
          Open in Maps
        </a>
        <Link
          href={`/pro/jobs/${params.jobId}/checkin`}
          className="bg-cobalt text-bone rounded-full py-3 text-sm font-semibold text-center"
        >
          I&rsquo;ve arrived →
        </Link>
      </div>
    </div>
  );
}

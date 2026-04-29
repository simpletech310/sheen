import Link from "next/link";
import { notFound } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";

export default async function CheckInPage({ params }: { params: { jobId: string } }) {
  const supabase = createClient();
  const { data: job } = await supabase
    .from("bookings")
    .select("id, qr_check_in_code")
    .eq("id", params.jobId)
    .maybeSingle();
  if (!job) notFound();

  return (
    <div className="px-5 pt-10 pb-8">
      <Eyebrow className="!text-bone/60" prefix={null}>
        Check-in
      </Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">Show this to the customer</h1>
      <p className="text-sm text-bone/60 mb-7">They scan to confirm you're the right person, then we start the timer.</p>

      <div className="bg-bone p-8 flex items-center justify-center mb-5">
        <QRCodeSVG
          value={`sheen://check-in/${job.id}/${job.qr_check_in_code}`}
          size={220}
          fgColor="#0A0A0A"
          bgColor="#FAFAF7"
        />
      </div>
      <div className="text-center font-mono text-sm tabular tracking-eyebrow mb-7">
        Code · {job.qr_check_in_code.toUpperCase()}
      </div>

      <Link
        href={`/pro/jobs/${params.jobId}/timer`}
        className="block w-full bg-cobalt text-bone rounded-full py-4 text-sm font-semibold text-center"
      >
        Customer scanned · Start timer →
      </Link>
    </div>
  );
}

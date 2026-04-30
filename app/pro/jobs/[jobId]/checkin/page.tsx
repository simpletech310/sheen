import Link from "next/link";
import { notFound } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { CheckInPolling } from "./CheckInPolling";

export const dynamic = "force-dynamic";

export default async function CheckInPage({
  params,
}: {
  params: { jobId: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: job } = await supabase
    .from("bookings")
    .select(
      "id, status, qr_check_in_code, customer_id, started_at, users:customer_id(full_name)"
    )
    .eq("id", params.jobId)
    .maybeSingle();
  if (!job) notFound();

  // QR points at a real public URL the customer can scan with any
  // camera app — no Sheen scheme handler needed. The code itself is
  // what gets validated server-side, so a manually-typed code works
  // too.
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://sheen-iota.vercel.app";
  const qrUrl = `${baseUrl}/c/checkin/${job.qr_check_in_code}`;
  const checkedIn = !!job.started_at;

  return (
    <div className="px-5 pt-10 pb-8">
      <Eyebrow className="!text-bone/60" prefix={null}>
        Check-in
      </Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">
        {checkedIn ? "CHECKED IN ✓" : "SHOW THIS TO THE CUSTOMER"}
      </h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-5" />

      {checkedIn ? (
        <p className="text-sm text-bone/60 mb-7">
          Customer confirmed at{" "}
          {new Date(job.started_at!).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
          . Timer&rsquo;s running. You get paid as soon as the customer
          approves the finished work.
        </p>
      ) : (
        <p className="text-sm text-bone/60 mb-7">
          They scan with the camera app, or read off the code below. Once they
          confirm, the timer starts. You get paid as soon as they approve
          the finished work.
        </p>
      )}

      {!checkedIn && (
        <>
          <div className="bg-bone p-8 flex items-center justify-center mb-3">
            <QRCodeSVG
              value={qrUrl}
              size={220}
              fgColor="#003594"
              bgColor="#FAFAF7"
              level="M"
            />
          </div>
          <div className="text-center font-mono text-xs tabular text-bone/50 mb-4 break-all px-4">
            {qrUrl}
          </div>
          <div className="text-center mb-7">
            <div className="font-mono text-[10px] uppercase tracking-wider text-bone/50 mb-1">
              Manual code
            </div>
            <div className="display tabular text-4xl tracking-[0.2em] text-sol">
              {job.qr_check_in_code?.toUpperCase()}
            </div>
          </div>
        </>
      )}

      {/* Auto-redirects to /timer once customer scans, so washer doesn't
          have to manually proceed. */}
      <CheckInPolling jobId={params.jobId} initialStartedAt={job.started_at} />

      <Link
        href={`/pro/jobs/${params.jobId}/timer`}
        className={`block w-full ${
          checkedIn
            ? "bg-sol text-ink hover:bg-bone"
            : "bg-bone/10 text-bone hover:bg-bone hover:text-ink"
        } rounded-full py-4 text-sm font-bold uppercase tracking-wide text-center transition`}
      >
        {checkedIn ? "Open timer →" : "Skip · open timer anyway →"}
      </Link>

      {user && (
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

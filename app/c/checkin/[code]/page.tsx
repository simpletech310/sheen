import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { CheckInClient } from "./CheckInClient";

export const dynamic = "force-dynamic";

/**
 * /c/checkin/[code]
 * Customer landing for QR scans. If they're not signed in, bounce to
 * sign-in then come back. If the code matches one of their bookings,
 * show a confirm screen — single tap to start the timer.
 */
export default async function CustomerCheckIn({
  params,
}: {
  params: { code: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/sign-in?next=/c/checkin/${params.code}`);
  }

  const code = params.code.toUpperCase();
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, customer_id, status, started_at, assigned_washer_id, scheduled_window_start, services(tier_name), addresses(street, city), users:assigned_washer_id(full_name)"
    )
    .eq("qr_check_in_code", code)
    .maybeSingle();

  if (!booking) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center px-6 py-16">
        <div className="max-w-md w-full">
          <Eyebrow>Check-in</Eyebrow>
          <h1 className="display text-3xl mt-3 mb-3">Code not recognized</h1>
          <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-5" />
          <p className="text-sm text-smoke leading-relaxed">
            That QR or code didn&rsquo;t match an active booking. Make sure the
            pro hasn&rsquo;t already started the timer, then try again.
          </p>
        </div>
      </div>
    );
  }

  if (booking.customer_id !== user.id) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center px-6 py-16">
        <div className="max-w-md w-full">
          <Eyebrow>Check-in</Eyebrow>
          <h1 className="display text-3xl mt-3 mb-3">Wrong account</h1>
          <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-5" />
          <p className="text-sm text-smoke leading-relaxed">
            This code is for a different customer. Sign out and back in with the
            account that booked the wash.
          </p>
        </div>
      </div>
    );
  }

  // Already started? Skip the confirmation and route to live tracking.
  if (booking.started_at) {
    redirect(`/app/tracking/${booking.id}`);
  }

  return (
    <div className="min-h-screen bg-bone px-5 pt-12 pb-8">
      <Eyebrow>Confirm arrival</Eyebrow>
      <h1 className="display text-[40px] leading-tight mt-3 mb-2">
        IS YOUR PRO HERE?
      </h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-6" />
      <p className="text-sm text-smoke mb-7 leading-relaxed">
        Confirm the pro is on site and we&rsquo;ll start the timer. Funds stay
        held in escrow until you approve the finished work.
      </p>

      <div className="bg-mist/40 p-5 mb-6 border-l-2 border-royal">
        <div className="font-mono text-[10px] uppercase tracking-wider text-smoke">
          Your wash
        </div>
        <div className="display text-2xl mt-1">
          {(booking as any).services?.tier_name ?? "Service"}
        </div>
        <div className="text-xs text-smoke mt-2">
          {(booking as any).addresses?.street}, {(booking as any).addresses?.city}
        </div>
        {(booking as any).users?.full_name && (
          <div className="text-xs mt-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-smoke">
              Pro
            </span>{" "}
            <span className="font-bold ml-1">
              {(booking as any).users.full_name}
            </span>
          </div>
        )}
      </div>

      <Suspense>
        <CheckInClient code={code} bookingId={booking.id} />
      </Suspense>

      <p className="text-[11px] text-smoke mt-6 leading-relaxed">
        Don&rsquo;t see the pro? Don&rsquo;t confirm yet — message them from{" "}
        <a
          href={`/app/tracking/${booking.id}`}
          className="text-royal underline"
        >
          your tracking page
        </a>
        .
      </p>
    </div>
  );
}

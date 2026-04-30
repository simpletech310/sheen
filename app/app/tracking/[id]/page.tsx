import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";
import { TrackingClient } from "@/components/customer/TrackingClient";
import { WasherProfileCard } from "@/components/customer/WasherProfileCard";
import { ChatPanel } from "@/components/chat/ChatPanel";

export const dynamic = "force-dynamic";

export default async function TrackingPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, assigned_washer_id, total_cents, addresses(lat, lng), services(tier_name)")
    .eq("id", params.id)
    .maybeSingle();

  if (!booking) notFound();

  const addr = (booking as any).addresses;
  const customerLat = addr?.lat ? Number(addr.lat) : 34.0522;
  const customerLng = addr?.lng ? Number(addr.lng) : -118.2437;

  // Pull the assigned washer's profile + name (best-effort).
  let washerProfile: any = null;
  let washerName: string | null = null;
  if (booking.assigned_washer_id) {
    const [{ data: wp }, { data: wu }] = await Promise.all([
      supabase
        .from("washer_profiles")
        .select(
          "user_id, jobs_completed, rating_avg, bio, has_own_water, has_pressure_washer, background_check_verified"
        )
        .eq("user_id", booking.assigned_washer_id)
        .maybeSingle(),
      supabase
        .from("users")
        .select("full_name")
        .eq("id", booking.assigned_washer_id)
        .maybeSingle(),
    ]);
    if (wp) {
      washerName = wu?.full_name ?? null;
      washerProfile = { ...wp, full_name: washerName };
    }
  }

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/washes" className="text-smoke text-sm">
          ← Washes
        </Link>
      </div>

      <Eyebrow>Wash · #{booking.id.slice(0, 8)} · live</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">
        {(booking as any).services?.tier_name ?? "Service"}
      </h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-6" />

      <TrackingClient
        bookingId={booking.id}
        initialStatus={booking.status}
        customerLat={customerLat}
        customerLng={customerLng}
        initialWasherId={booking.assigned_washer_id}
      />

      {washerProfile && (
        <div className="mt-6">
          <Eyebrow>Your pro</Eyebrow>
          <div className="mt-2">
            <WasherProfileCard profile={washerProfile} publicLink />
          </div>
        </div>
      )}

      {user && booking.assigned_washer_id && (
        <ChatPanel
          bookingId={booking.id}
          currentUserId={user.id}
          otherName={washerName ?? "your pro"}
          variant="customer"
        />
      )}

      <div className="mt-6 bg-mist/40 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-smoke">Total</span>
          <span className="display tabular text-xl">{fmtUSD(booking.total_cents)}</span>
        </div>
      </div>

      {booking.status === "completed" && (
        <Link
          href={`/app/rate/${booking.id}`}
          className="mt-6 block text-center bg-royal text-bone py-4 text-sm font-bold uppercase tracking-wide hover:bg-ink"
        >
          Rate &amp; tip →
        </Link>
      )}
    </div>
  );
}

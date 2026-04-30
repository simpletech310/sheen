import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";
import { distanceMiles } from "@/lib/mapbox";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  lat: z.number(),
  lng: z.number(),
  heading: z.number().optional(),
  speed_mph: z.number().optional(),
});

// Geofence radius — within ~150m we declare "arrived".
const ARRIVAL_RADIUS_MILES = 0.1;

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = Body.parse(await req.json());
  const { error } = await supabase.from("washer_positions").upsert({
    washer_id: user.id,
    lat: body.lat,
    lng: body.lng,
    heading: body.heading ?? null,
    speed_mph: body.speed_mph ?? null,
    updated_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Geofence: if the washer has an en_route booking and they're within the
  // arrival radius, auto-flip status to 'arrived' and push the customer.
  // Run with the service client so we can update on the customer's side
  // of the booking (the washer's RLS only allows update of their own
  // assigned bookings — which this is, but we use service for the push
  // user lookup to be safe).
  try {
    const svc = createServiceClient();
    const { data: enroute } = await svc
      .from("bookings")
      .select(
        "id, customer_id, is_rush, rush_deadline, arrived_at, rush_made_in_time, addresses(lat, lng), services(tier_name), assigned_washer_id"
      )
      .eq("assigned_washer_id", user.id)
      .eq("status", "en_route")
      .maybeSingle();

    if (enroute && (enroute as any).addresses?.lat && (enroute as any).addresses?.lng) {
      const dist = distanceMiles(
        { lat: body.lat, lng: body.lng },
        {
          lat: Number((enroute as any).addresses.lat),
          lng: Number((enroute as any).addresses.lng),
        }
      );
      if (dist <= ARRIVAL_RADIUS_MILES) {
        // Lock in the rush verdict + arrival timestamp in the same
        // update so /api/payout/release can read a consistent picture.
        const arrivedAtIso =
          (enroute as any).arrived_at ?? new Date().toISOString();
        let madeInTime: boolean | null = (enroute as any).rush_made_in_time;
        if (
          (enroute as any).is_rush &&
          madeInTime === null &&
          (enroute as any).rush_deadline
        ) {
          madeInTime =
            new Date(arrivedAtIso).getTime() <=
            new Date((enroute as any).rush_deadline).getTime();
        }
        await svc
          .from("bookings")
          .update({
            status: "arrived",
            arrived_at: arrivedAtIso,
            rush_made_in_time: madeInTime,
          })
          .eq("id", enroute.id)
          .eq("status", "en_route"); // re-check to avoid races

        await svc.from("booking_events").insert({
          booking_id: enroute.id,
          type: "arrived",
          actor_id: user.id,
          payload: { method: "geofence", distance_mi: Number(dist.toFixed(3)) },
        });

        sendPushToUser(enroute.customer_id, {
          title: "Your pro just arrived",
          body: "Tap to confirm and start the timer.",
          url: `/app/tracking/${enroute.id}`,
          tag: `booking-${enroute.id}-arrival`,
        }).catch(() => {});
      }
    }
  } catch {
    // Geofence is best-effort — don't fail the position update on it.
  }

  return NextResponse.json({ ok: true });
}

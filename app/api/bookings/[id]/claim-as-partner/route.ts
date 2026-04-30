import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Confirm the user is an active partner.
  const { data: pp } = await supabase
    .from("partner_profiles")
    .select("status, business_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!pp || pp.status !== "active") {
    return NextResponse.json({ error: "Partner not active" }, { status: 403 });
  }

  // Atomic-ish claim: only update if still unclaimed by anyone.
  const { data, error } = await supabase
    .from("bookings")
    .update({ assigned_partner_id: user.id, status: "matched" })
    .eq("id", params.id)
    .eq("status", "pending")
    .is("assigned_washer_id", null)
    .is("assigned_partner_id", null)
    .select("id, customer_id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Already claimed" }, { status: 409 });

  await supabase.from("booking_events").insert({
    booking_id: params.id,
    type: "matched",
    actor_id: user.id,
    payload: { partner: pp.business_name },
  });

  // Notify the customer.
  sendPushToUser(data.customer_id, {
    title: "Your wash is matched",
    body: `${pp.business_name} is on your booking.`,
    url: `/app/tracking/${params.id}`,
    tag: `booking-${params.id}`,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}

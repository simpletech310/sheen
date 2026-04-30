import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";
import { computeFees } from "@/lib/stripe/fees";
import { PartnerClaimButton } from "./PartnerClaimButton";

export const dynamic = "force-dynamic";

export default async function PartnerQueuePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/partner/queue");

  const { data: partner } = await supabase
    .from("partner_profiles")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!partner || partner.status !== "active") {
    return (
      <div className="px-5 pt-10 pb-8 max-w-3xl mx-auto">
        <Link href="/partner/dashboard" className="text-sm text-smoke">← Dashboard</Link>
        <Eyebrow className="mt-4">Partner queue</Eyebrow>
        <h1 className="display text-3xl mt-3 mb-3">Application pending</h1>
        <p className="text-sm text-smoke">
          Once your partner application is approved, available jobs will appear here.
        </p>
      </div>
    );
  }

  const { data: jobs } = await supabase
    .from("bookings")
    .select(
      "id, status, total_cents, service_cents, scheduled_window_start, customer_note, services(tier_name, duration_minutes), addresses(city, state)"
    )
    .eq("status", "pending")
    .is("assigned_washer_id", null)
    .is("assigned_partner_id", null)
    .order("scheduled_window_start", { ascending: true })
    .limit(40);

  return (
    <div className="px-5 pt-10 pb-8 max-w-3xl mx-auto">
      <Link href="/partner/dashboard" className="text-sm text-smoke">← Dashboard</Link>
      <Eyebrow className="mt-4">Available jobs</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">Queue</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-6" />

      {(jobs ?? []).length === 0 ? (
        <div className="bg-mist/40 p-6 text-center text-sm text-smoke">
          No jobs available right now. Check back soon — new bookings come in throughout the day.
        </div>
      ) : (
        <div className="space-y-3">
          {(jobs ?? []).map((j: any) => {
            const fees = computeFees({ serviceCents: j.service_cents, routedTo: "partner" });
            return (
              <div key={j.id} className="bg-bone border border-mist p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-sm font-bold">{j.services?.tier_name}</div>
                    <div className="text-xs text-smoke mt-0.5">
                      {j.addresses?.city}, {j.addresses?.state} · {j.services?.duration_minutes ?? 60} min
                    </div>
                    <div className="text-xs text-smoke mt-0.5">
                      {new Date(j.scheduled_window_start).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="display tabular text-xl text-royal">
                      {fmtUSD(fees.washerOrPartnerNet)}
                    </div>
                    <div className="font-mono text-[10px] uppercase text-smoke">You earn</div>
                  </div>
                </div>
                {j.customer_note && (
                  <div className="text-xs text-smoke bg-mist/40 p-2 mb-3">
                    Note: {j.customer_note}
                  </div>
                )}
                <PartnerClaimButton jobId={j.id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

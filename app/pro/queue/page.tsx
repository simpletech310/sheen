import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";
import { computeFees } from "@/lib/stripe/fees";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const supabase = createClient();
  const { data: jobs } = await supabase
    .from("bookings")
    .select("id, scheduled_window_start, service_cents, total_cents, services(tier_name, category), addresses(street, city)")
    .eq("status", "pending")
    .is("assigned_washer_id", null)
    .order("scheduled_window_start", { ascending: true })
    .limit(20);

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex justify-between items-center mb-6">
        <Eyebrow className="!text-bone/60" prefix={null}>
          Available · 5 mi radius
        </Eyebrow>
        <span className="font-mono text-[10px] text-good uppercase">● Online</span>
      </div>
      <h1 className="display text-3xl mb-6">Queue</h1>

      {jobs && jobs.length > 0 ? (
        <div className="space-y-3">
          {jobs.map((j: any) => {
            const net = computeFees({ serviceCents: j.service_cents, routedTo: "solo_washer" }).washerOrPartnerNet;
            return (
              <Link
                key={j.id}
                href={`/pro/queue/${j.id}`}
                className="block bg-white/5 hover:bg-white/10 p-4 transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-semibold">{j.services?.tier_name ?? "Service"}</div>
                    <div className="text-xs text-bone/60 mt-1">
                      {j.addresses?.street}, {j.addresses?.city}
                    </div>
                    <div className="font-mono text-[10px] text-bone/50 uppercase mt-1.5 tabular">
                      {new Date(j.scheduled_window_start).toLocaleString([], {
                        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="display tabular text-2xl text-cobalt">{fmtUSD(net)}</div>
                    <div className="font-mono text-[10px] text-bone/50">YOU GET</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-white/5 p-6 text-center text-sm text-bone/60">
          No jobs in your radius right now. Check back soon.
        </div>
      )}
    </div>
  );
}

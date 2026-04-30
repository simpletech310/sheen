import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { createClient } from "@/lib/supabase/server";
import { fmtUSD } from "@/lib/pricing";
import { RecurringRow } from "./RecurringRow";

export const dynamic = "force-dynamic";

const FREQ_LABEL: Record<string, string> = {
  weekly: "Every week",
  biweekly: "Every 2 weeks",
  monthly: "Every month",
};

export default async function RecurringPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: templates } = await supabase
    .from("recurring_booking_templates")
    .select(
      "id, frequency, preferred_window, next_run_at, active, paused, vehicle_ids, services(tier_name, category, base_price_cents), addresses(street, city, state)"
    )
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  return (
    <div className="px-5 pt-10 pb-8">
      <Link href="/app/me" className="text-sm text-smoke">← Account</Link>
      <Eyebrow className="mt-4">Recurring schedule</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">Repeat washes</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-6" />

      {(templates ?? []).length === 0 ? (
        <div className="bg-mist/40 p-6 text-center text-sm text-smoke">
          <p>No recurring schedule yet.</p>
          <p className="mt-2">
            Set one up after you book a wash — we&rsquo;ll re-create the same
            booking automatically every week, two weeks, or month.
          </p>
          <Link
            href="/app/book"
            className="inline-block mt-4 bg-ink text-bone px-5 py-3 text-xs font-bold uppercase tracking-wide hover:bg-royal transition"
          >
            Book a wash →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {(templates ?? []).map((t: any) => (
            <RecurringRow
              key={t.id}
              id={t.id}
              tier={t.services?.tier_name ?? "Wash"}
              category={t.services?.category ?? "auto"}
              perVehiclePrice={t.services?.base_price_cents ?? 0}
              vehicleCount={t.vehicle_ids?.length ?? 1}
              cadence={FREQ_LABEL[t.frequency] ?? t.frequency}
              window={t.preferred_window}
              nextRunAt={t.next_run_at}
              addressLine={
                t.addresses
                  ? `${t.addresses.street}, ${t.addresses.city}, ${t.addresses.state}`
                  : null
              }
              paused={!!t.paused}
              active={!!t.active}
            />
          ))}
        </div>
      )}

      <p className="text-[11px] text-smoke mt-6 leading-relaxed">
        Bookings auto-create 24–36 hours before the window, charge your
        default card, and follow your normal cancel/reschedule rules.
      </p>
    </div>
  );
}

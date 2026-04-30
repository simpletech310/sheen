import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";
import { NextWashHero } from "@/components/customer/NextWashHero";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = ["pending", "matched", "en_route", "arrived", "in_progress"];

export default async function CustomerHome() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const firstName = (profile?.full_name ?? user?.email ?? "there")
    .split(" ")[0]
    ?.split("@")[0];

  // Lifetime completed wash count for the hero strip
  const { count: washCount } = await supabase
    .from("bookings")
    .select("id", { head: true, count: "exact" })
    .eq("customer_id", user?.id ?? "")
    .eq("status", "completed");

  // Upcoming / in-flight booking — earliest scheduled active row.
  const { data: nextBookings } = await supabase
    .from("bookings")
    .select(
      "id, status, scheduled_window_start, total_cents, vehicle_count, assigned_washer_id, services(tier_name, category), addresses(street, city, state)"
    )
    .eq("customer_id", user?.id ?? "")
    .in("status", ACTIVE_STATUSES)
    .order("scheduled_window_start", { ascending: true })
    .limit(1);
  const next: any = nextBookings?.[0] ?? null;

  // If we have a pro on it, fetch their identity in one shot.
  let proName: string | null = null;
  let proRating: number | null = null;
  if (next?.assigned_washer_id) {
    const [{ data: u }, { data: wp }] = await Promise.all([
      supabase
        .from("users")
        .select("full_name")
        .eq("id", next.assigned_washer_id)
        .maybeSingle(),
      supabase
        .from("washer_profiles")
        .select("rating_avg")
        .eq("user_id", next.assigned_washer_id)
        .maybeSingle(),
    ]);
    proName = u?.full_name ?? null;
    proRating = wp?.rating_avg ? Number(wp.rating_avg) : null;
  }

  return (
    <>
      {/* Branded hero strip */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/img/hero.jpg)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-royal/85 via-royal/70 to-ink/85" />
        <div className="relative px-5 pt-10 pb-9 text-bone">
          <Eyebrow className="!text-sol" prefix="──">
            Hi, {firstName}
          </Eyebrow>
          <h1 className="display text-[36px] leading-[0.95] mt-4">
            {next ? (
              <>
                Your next
                <br />
                <span className="text-sol">wash is set.</span>
              </>
            ) : (
              <>
                What&rsquo;s getting
                <br />
                <span className="text-sol">cleaned today?</span>
              </>
            )}
          </h1>
          <div className="mt-5 flex gap-6 text-xs">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">
                Washes
              </div>
              <div className="display tabular text-xl mt-0.5">{washCount ?? 0}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">
                Status
              </div>
              <div className="display tabular text-xl mt-0.5">
                {next ? "Active" : "Ready"}
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-sol" />
      </div>

      <div className="px-5 pt-5 pb-8">
        {/* Next-wash hero — only when we have an active booking */}
        {next && (
          <div className="mb-7">
            <NextWashHero
              bookingId={next.id}
              status={next.status}
              tierName={next.services?.tier_name ?? "Wash"}
              category={(next.services?.category ?? "auto") as any}
              scheduledAt={next.scheduled_window_start}
              addressLine={
                next.addresses
                  ? `${next.addresses.street}, ${next.addresses.city}, ${next.addresses.state}`
                  : null
              }
              proName={proName}
              proInitial={proName ? proName[0]?.toUpperCase() ?? null : null}
              proRating={proRating}
              vehicleCount={next.vehicle_count ?? 1}
              total={fmtUSD(next.total_cents)}
            />
          </div>
        )}

        <Eyebrow>{next ? "Book another" : "Pick a service"}</Eyebrow>
        <div className="mt-3 space-y-3">
          <Link
            href="/app/book/auto"
            className="block bg-bone border border-mist hover:border-ink p-5 transition group"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="display text-2xl group-hover:text-royal transition">Auto</div>
                <div className="text-xs text-smoke mt-1">4 tiers · Express → Showroom</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] text-smoke uppercase">From</div>
                <div className="display tabular text-xl">$35</div>
              </div>
            </div>
            <div className="mt-4 h-[2px] w-12 bg-gradient-to-r from-royal to-sol opacity-0 group-hover:opacity-100 transition" />
          </Link>

          <Link
            href="/app/book/home"
            className="block bg-bone border border-mist hover:border-ink p-5 transition group"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="display text-2xl group-hover:text-royal transition">Home</div>
                <div className="text-xs text-smoke mt-1">Driveway · siding · deck · solar</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] text-smoke uppercase">From</div>
                <div className="display tabular text-xl">$95</div>
              </div>
            </div>
            <div className="mt-4 h-[2px] w-12 bg-gradient-to-r from-royal to-sol opacity-0 group-hover:opacity-100 transition" />
          </Link>

          <Link
            href="/app/book/commercial"
            className="block bg-bone border border-mist hover:border-ink p-5 transition group"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="display text-2xl group-hover:text-royal transition">
                  Commercial
                </div>
                <div className="text-xs text-smoke mt-1">
                  Storefront · fleet · post-construction
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] text-smoke uppercase">Quoted</div>
                <div className="display text-xl">→</div>
              </div>
            </div>
            <div className="mt-4 h-[2px] w-12 bg-gradient-to-r from-royal to-sol opacity-0 group-hover:opacity-100 transition" />
          </Link>
        </div>

      </div>
    </>
  );
}

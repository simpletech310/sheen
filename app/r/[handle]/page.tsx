import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";

export const dynamic = "force-dynamic";

export default async function ProReferralPage({
  params,
}: {
  params: { handle: string };
}) {
  const handle = (params.handle ?? "").trim().replace(/^@/, "").toUpperCase();
  if (!/^[A-Z0-9]{3,20}$/.test(handle)) notFound();

  const supa = createServiceClient();
  const { data: wp } = await supa
    .from("washer_profiles")
    .select(
      "user_id, status, jobs_completed, rating_avg, bio, has_own_water, has_pressure_washer, background_check_verified"
    )
    .eq("wash_handle", handle)
    .maybeSingle();
  if (!wp || wp.status !== "active") notFound();

  const { data: u } = await supa
    .from("users")
    .select("full_name")
    .eq("id", wp.user_id)
    .maybeSingle();

  const fullName = u?.full_name ?? "Sheen Pro";
  const initial = fullName[0]?.toUpperCase() ?? "P";
  const rating = wp.rating_avg ? Number(wp.rating_avg).toFixed(1) : "—";

  return (
    <div className="min-h-screen bg-bone">
      <section className="relative overflow-hidden bg-ink text-bone">
        <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
        <div className="px-6 md:px-12 pt-12 pb-10 max-w-2xl mx-auto">
          <Link
            href="/"
            className="font-mono text-[10px] uppercase tracking-wider text-bone/60"
          >
            ← Sheen
          </Link>

          <div className="mt-8 flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-royal text-bone flex items-center justify-center display text-3xl shrink-0">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <Eyebrow className="!text-sol" prefix={null}>
                Sheen pro
              </Eyebrow>
              <h1 className="display text-3xl mt-2">{fullName}</h1>
              <div className="flex gap-3 text-sm text-bone/80 mt-2 flex-wrap">
                <span>
                  <span className="text-sol">★</span> {rating}
                </span>
                <span>·</span>
                <span>{wp.jobs_completed?.toLocaleString() ?? 0} jobs</span>
                {wp.background_check_verified && (
                  <>
                    <span>·</span>
                    <span className="text-good">✓ Verified</span>
                  </>
                )}
              </div>
              <div className="font-mono text-sm text-sol tabular tracking-wider mt-2">
                @{handle}
              </div>
            </div>
          </div>

          {wp.bio && (
            <p className="text-sm leading-relaxed text-bone/80 mt-6">{wp.bio}</p>
          )}

          <div className="flex flex-wrap gap-2 mt-5">
            {wp.has_own_water && (
              <span className="font-mono text-[10px] uppercase tracking-wider bg-bone/10 px-2 py-0.5">
                Self-supplied water
              </span>
            )}
            {wp.has_pressure_washer && (
              <span className="font-mono text-[10px] uppercase tracking-wider bg-bone/10 px-2 py-0.5">
                Pressure washer
              </span>
            )}
          </div>

          <Link
            href={`/app/book/auto?handle=${handle}`}
            className="mt-8 inline-block bg-sol text-ink px-6 py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-bone transition"
          >
            Book a wash with @{handle} →
          </Link>
          <div className="text-[11px] text-bone/60 mt-3 leading-relaxed">
            Sign in or create an account at checkout. @{handle} gets a 5-minute
            window to accept before the booking opens to the general queue.
          </div>
        </div>
      </section>

      <section className="px-6 md:px-12 py-10 max-w-2xl mx-auto">
        <div className="font-mono text-[10px] uppercase tracking-wider text-smoke">
          What is Sheen?
        </div>
        <h2 className="display text-2xl mt-2 mb-3">On-demand car & home wash.</h2>
        <p className="text-sm text-ink/80 leading-relaxed">
          Vetted local pros · $2,500 damage guarantee · book in 60 seconds. We
          handle the payment, you keep the relationship.
        </p>
        <Link
          href="/"
          className="inline-block mt-5 text-xs font-mono uppercase tracking-wider text-ink underline"
        >
          Learn more →
        </Link>
      </section>
    </div>
  );
}

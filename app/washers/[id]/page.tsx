import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function WasherProfilePage({ params }: { params: { id: string } }) {
  const supa = createServiceClient();

  const [{ data: profile }, { data: userRow }, { data: reviews }] = await Promise.all([
    supa
      .from("washer_profiles")
      .select(
        "user_id, status, jobs_completed, rating_avg, bio, has_own_water, has_pressure_washer, service_radius_miles, background_check_verified"
      )
      .eq("user_id", params.id)
      .maybeSingle(),
    supa.from("users").select("full_name").eq("id", params.id).maybeSingle(),
    supa
      .from("reviews")
      .select("rating_int, comment, created_at, reviewer_id")
      .eq("reviewee_id", params.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (!profile || profile.status !== "active") notFound();

  const fullName = userRow?.full_name ?? "Sheen Pro";
  const initial = fullName[0].toUpperCase();
  const rating = profile.rating_avg ? Number(profile.rating_avg).toFixed(1) : "—";
  const jobs = profile.jobs_completed ?? 0;

  return (
    <div className="max-w-2xl mx-auto px-5 pt-10 pb-12">
      <Link href="/" className="text-sm text-smoke">← Sheen</Link>

      <div className="mt-6 flex items-center gap-5">
        <div className="w-24 h-24 rounded-full bg-royal text-bone flex items-center justify-center display text-4xl shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <Eyebrow>Sheen Pro</Eyebrow>
          <h1 className="display text-3xl mt-2">{fullName}</h1>
          <div className="flex gap-3 text-sm text-smoke mt-2">
            <span>
              <span className="text-sol">★</span> {rating}
            </span>
            <span>·</span>
            <span>{jobs.toLocaleString()} jobs</span>
            {profile.background_check_verified && (
              <>
                <span>·</span>
                <span className="text-good">✓ Verified</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mt-6 mb-6" />

      {profile.bio && (
        <p className="text-base leading-relaxed text-ink/85 mb-6">{profile.bio}</p>
      )}

      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="bg-mist/40 p-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-smoke">
            Service radius
          </div>
          <div className="display tabular text-2xl mt-1">
            {profile.service_radius_miles ?? 5} mi
          </div>
        </div>
        <div className="bg-mist/40 p-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-smoke">
            Equipment
          </div>
          <div className="text-sm mt-1 leading-tight">
            {[
              profile.has_own_water && "Self-supplied water",
              profile.has_pressure_washer && "Pressure washer",
            ]
              .filter(Boolean)
              .join(" · ") || "Standard kit"}
          </div>
        </div>
      </div>

      <Eyebrow>Recent reviews</Eyebrow>
      <div className="mt-3 space-y-3">
        {(reviews ?? []).length === 0 ? (
          <div className="bg-mist/40 p-5 text-center text-sm text-smoke">
            No reviews yet — book a wash and be the first.
          </div>
        ) : (
          reviews!.map((r: any, i: number) => (
            <div key={i} className="bg-mist/40 p-4">
              <div className="flex justify-between items-center">
                <div className="text-sol text-sm tracking-widest">
                  {"★".repeat(r.rating_int)}
                  <span className="text-mist">{"★".repeat(5 - r.rating_int)}</span>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-smoke">
                  {new Date(r.created_at).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>
              {r.comment && (
                <p className="text-sm mt-2 leading-relaxed text-ink/85">{r.comment}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

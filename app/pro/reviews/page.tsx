import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { createClient } from "@/lib/supabase/server";
import { publicCustomerName } from "@/lib/display-name";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Reviews where the washer is the reviewee — these are the comments
  // customers left after their wash. RLS already scopes this query.
  const { data: reviews } = await supabase
    .from("reviews")
    .select("rating_int, comment, created_at, reviewer_id, booking_id")
    .eq("reviewee_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  const total = reviews?.length ?? 0;
  const avg =
    total > 0
      ? (reviews!.reduce((a, r: any) => a + r.rating_int, 0) / total).toFixed(2)
      : "—";

  // Distribution for the bar chart.
  const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of reviews ?? []) dist[(r as any).rating_int] = (dist[(r as any).rating_int] ?? 0) + 1;
  const max = Math.max(1, ...Object.values(dist));

  // Look up reviewer names — display_name preferred, full_name fallback,
  // then masked to "First L." via publicCustomerName for privacy.
  const reviewerIds = Array.from(
    new Set((reviews ?? []).map((r: any) => r.reviewer_id))
  );
  const { data: reviewers } = reviewerIds.length
    ? await supabase
        .from("users")
        .select("id, full_name, display_name")
        .in("id", reviewerIds)
    : { data: [] as any[] };
  const nameById = new Map<string, string>(
    (reviewers ?? []).map((u: any) => [
      u.id,
      publicCustomerName({ display_name: u.display_name, full_name: u.full_name }),
    ])
  );

  return (
    <div className="px-5 pt-10 pb-8">
      <Link href="/pro" className="text-bone/60 text-sm">
        ← Home
      </Link>
      <Eyebrow className="!text-bone/60 mt-4" prefix={null}>
        Reviews
      </Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">YOUR RATING</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-6" />

      <div className="bg-white/5 p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="display tabular text-[56px] leading-none">
              {avg}
              <span className="text-sol ml-2 text-3xl">★</span>
            </div>
            <div className="font-mono text-[10px] text-bone/60 uppercase tracking-wider mt-2">
              {total} review{total === 1 ? "" : "s"}
            </div>
          </div>
          <div className="flex-1 max-w-[200px] space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = dist[star] ?? 0;
              const pct = (count / max) * 100;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-sol">{star}</span>
                  <div className="flex-1 h-1.5 bg-bone/10 relative overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-sol"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-5 text-right tabular text-bone/60">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {total === 0 ? (
        <div className="bg-white/5 p-8 text-center">
          <div className="font-mono text-[10px] uppercase tracking-wider text-sol mb-2">
            No reviews yet
          </div>
          <p className="text-sm text-bone/60">
            Customers rate after every wash. Show up sharp and they will too.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {(reviews ?? []).map((r: any, i) => {
            const name = nameById.get(r.reviewer_id) ?? "Sheen customer";
            const hasComment = !!(r.comment && r.comment.trim());
            return (
              <div key={i} className="bg-white/5 p-4">
                <div className="flex justify-between items-baseline">
                  <div className="text-sol text-sm">
                    {"★".repeat(r.rating_int)}
                    <span className="text-bone/30">
                      {"★".repeat(5 - r.rating_int)}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] text-bone/50 tabular">
                    {new Date(r.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <div className="text-xs text-bone/65 mt-1.5 font-bold">{name}</div>
                {hasComment ? (
                  <p className="text-sm text-bone/85 mt-2 leading-relaxed">{r.comment}</p>
                ) : (
                  <p className="text-xs text-bone/40 mt-2 italic">No written feedback.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { getTranslations } from "next-intl/server";
import { tierLabel, tierProgress, type Tier } from "@/lib/tier";

type Props = {
  tier: Tier;
  jobsCompleted: number;
  ratingAvg: number | null;
};

// Server component — pure render of tier state + next-tier ladder.
// Mirrors the marketing /wash page's ladder so the pro sees the same
// rungs they're climbing toward.
export async function TierProgressCard({ tier, jobsCompleted, ratingAvg }: Props) {
  const t = await getTranslations("proMe");
  const progress = tierProgress(jobsCompleted, ratingAvg);

  return (
    <div className="bg-white/5 p-4 mb-3 border-l-2 border-sol">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10px] uppercase opacity-60 tracking-wider">
            {t("tierLabel")}
          </div>
          <div className="display text-2xl mt-1 leading-none">
            {tierLabel(tier)}
          </div>
        </div>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider px-2 py-1 bg-sol text-ink">
          {jobsCompleted} {t("tierJobs")}
        </span>
      </div>

      {progress.next ? (
        <div className="space-y-2">
          <div className="text-xs text-bone/70 leading-relaxed">
            {progress.jobsNeeded && progress.jobsNeeded > 0 ? (
              <>
                <span className="text-sol font-bold">{progress.jobsNeeded}</span>{" "}
                {t("tierMoreJobsTo")}{" "}
                <span className="font-bold">{tierLabel(progress.next)}</span>
                {progress.ratingNeeded
                  ? `, ${t("tierKeepRating", { rating: progress.ratingNeeded.toFixed(1) })}`
                  : "."}
              </>
            ) : progress.ratingNeeded ? (
              <>
                {t("tierKeepRatingTo", {
                  rating: progress.ratingNeeded.toFixed(1),
                  next: tierLabel(progress.next),
                })}
              </>
            ) : (
              t("tierEvaluating")
            )}
          </div>
          <div className="bg-ink/40 p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-bone/55 mb-1.5">
              {t("tierUnlocksAt", { next: tierLabel(progress.next) })}
            </div>
            <ul className="space-y-1">
              {progress.unlocksAtNext.map((u, i) => (
                <li key={i} className="text-xs text-bone/80 leading-snug">
                  → {u}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="text-xs text-bone/70 leading-relaxed">
          {t("tierLegendBlurb")}
        </div>
      )}
    </div>
  );
}

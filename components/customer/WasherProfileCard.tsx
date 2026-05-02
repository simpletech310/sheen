import Link from "next/link";

type WasherProfile = {
  user_id: string;
  jobs_completed: number | null;
  rating_avg: number | null;
  bio: string | null;
  has_own_water: boolean | null;
  has_pressure_washer: boolean | null;
  background_check_verified?: boolean | null;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

const PUBLIC_AVATAR_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/avatars`;

export function WasherProfileCard({
  profile,
  publicLink = false,
}: {
  profile: WasherProfile;
  publicLink?: boolean;
}) {
  const displayedName = profile.display_name || profile.full_name || "Your pro";
  const initial = displayedName[0].toUpperCase();
  const rating = profile.rating_avg ? Number(profile.rating_avg).toFixed(1) : "—";
  const jobs = profile.jobs_completed ?? 0;
  const avatarUrl = profile.avatar_url ? `${PUBLIC_AVATAR_BASE}/${profile.avatar_url}` : null;

  const inner = (
    <>
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={avatarUrl}
            alt={displayedName}
            className="w-14 h-14 rounded-full object-cover bg-mist shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-royal text-bone flex items-center justify-center display text-xl shrink-0">
            {initial}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="display text-xl truncate">{displayedName}</span>
            {profile.background_check_verified && (
              <span
                title="Background-checked"
                className="font-mono text-[9px] uppercase tracking-wider bg-good text-bone px-1.5 py-0.5"
              >
                ✓ Verified
              </span>
            )}
          </div>
          <div className="flex gap-2 text-xs text-smoke mt-0.5">
            <span>
              <span className="text-sol">★</span> {rating}
            </span>
            <span>·</span>
            <span>{jobs.toLocaleString()} jobs</span>
          </div>
        </div>
        {publicLink && <span className="text-smoke">→</span>}
      </div>

      {(profile.has_own_water || profile.has_pressure_washer) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {profile.has_own_water && (
            <span className="font-mono text-[10px] uppercase tracking-wider bg-mist px-2 py-0.5">
              Self-supplied water
            </span>
          )}
          {profile.has_pressure_washer && (
            <span className="font-mono text-[10px] uppercase tracking-wider bg-mist px-2 py-0.5">
              Pressure washer
            </span>
          )}
        </div>
      )}

      {profile.bio && (
        <p className="mt-3 text-sm text-ink/80 leading-relaxed">{profile.bio}</p>
      )}
    </>
  );

  return publicLink ? (
    <Link
      href={`/washers/${profile.user_id}`}
      className="block bg-bone border border-mist hover:border-ink p-4 transition"
    >
      {inner}
    </Link>
  ) : (
    <div className="bg-bone border border-mist p-4">{inner}</div>
  );
}

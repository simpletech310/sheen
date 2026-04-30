import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: catalog }, { data: unlocked }] = await Promise.all([
    supabase.from("achievements").select("id, display_name, description, icon, bonus_points, sort_order").order("sort_order"),
    supabase.from("user_achievements").select("achievement_id, unlocked_at").eq("user_id", user?.id ?? ""),
  ]);

  const have = new Map((unlocked ?? []).map((u) => [u.achievement_id, u.unlocked_at]));

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/me" className="text-smoke text-sm">
          ← Profile
        </Link>
      </div>
      <Eyebrow>Achievements</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-6">YOUR BADGES</h1>

      <div className="grid grid-cols-2 gap-3">
        {(catalog ?? []).map((a) => {
          const unlockedAt = have.get(a.id);
          const isUnlocked = !!unlockedAt;
          return (
            <div
              key={a.id}
              className={`p-4 ${isUnlocked ? "bg-royal text-bone" : "bg-mist/40 text-ink opacity-60"}`}
            >
              <div className="text-3xl mb-2">{a.icon}</div>
              <div className="font-bold uppercase tracking-wide text-sm">{a.display_name}</div>
              <div className="text-xs mt-1 opacity-80">{a.description}</div>
              <div className="font-mono text-[10px] uppercase opacity-60 mt-3">
                {isUnlocked
                  ? `+${a.bonus_points} pts · ${new Date(unlockedAt).toLocaleDateString()}`
                  : `Locked · +${a.bonus_points} pts`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

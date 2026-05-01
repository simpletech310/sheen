import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { ProfileEditor } from "./ProfileEditor";

export const dynamic = "force-dynamic";

export default async function ProMeEditPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: me }, { data: wp }] = await Promise.all([
    supabase
      .from("users")
      .select("full_name, display_name, avatar_url")
      .eq("id", user?.id ?? "")
      .maybeSingle(),
    supabase
      .from("washer_profiles")
      .select(
        "bio, service_radius_miles, base_lat, base_lng, has_own_water, has_own_power, has_pressure_washer, can_detail_interior, can_do_paint_correction"
      )
      .eq("user_id", user?.id ?? "")
      .maybeSingle(),
  ]);

  return (
    <div className="px-5 pt-10 pb-8">
      <Link href="/pro/me" className="text-bone/60 text-sm">
        ← Profile
      </Link>
      <Eyebrow className="!text-bone/60 mt-4" prefix={null}>
        Edit profile
      </Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">YOUR PROFILE</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-6" />
      <ProfileEditor
        userId={user?.id ?? ""}
        initial={{
          full_name: me?.full_name ?? "",
          display_name: me?.display_name ?? "",
          avatar_url: me?.avatar_url ?? null,
          bio: wp?.bio ?? "",
          service_radius_miles: wp?.service_radius_miles ?? 5,
          base_lat: wp?.base_lat ?? null,
          base_lng: wp?.base_lng ?? null,
          has_own_water: !!wp?.has_own_water,
          has_own_power: !!wp?.has_own_power,
          has_pressure_washer: !!wp?.has_pressure_washer,
          can_detail_interior: !!wp?.can_detail_interior,
          can_do_paint_correction: !!wp?.can_do_paint_correction,
        }}
      />
    </div>
  );
}

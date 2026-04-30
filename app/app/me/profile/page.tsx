import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { ProfileForm } from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email, phone")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  return (
    <div className="px-5 pt-10 pb-8">
      <Link href="/app/me" className="text-sm text-smoke">← Account</Link>
      <Eyebrow className="mt-4">Edit profile</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">Profile</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-6" />

      <ProfileForm
        initial={{
          full_name: profile?.full_name ?? "",
          email: profile?.email ?? user?.email ?? "",
          phone: profile?.phone ?? "",
        }}
      />
    </div>
  );
}

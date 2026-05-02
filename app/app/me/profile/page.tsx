import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { ProfileForm } from "./ProfileForm";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const t = await getTranslations("appProfile");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users")
    .select("full_name, display_name, email, phone, avatar_url")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  return (
    <div className="px-5 pt-10 pb-8">
      <Link href="/app/me" className="text-sm text-smoke">{t("backLink")}</Link>
      <Eyebrow className="mt-4">{t("eyebrow")}</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">{t("heading")}</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-6" />

      <ProfileForm
        userId={user?.id ?? ""}
        initial={{
          full_name: profile?.full_name ?? "",
          display_name: profile?.display_name ?? "",
          email: profile?.email ?? user?.email ?? "",
          phone: profile?.phone ?? "",
          avatar_url: profile?.avatar_url ?? null,
        }}
      />
    </div>
  );
}

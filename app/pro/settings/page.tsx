import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { NotificationToggles } from "./NotificationToggles";

export const dynamic = "force-dynamic";

export default async function ProSettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("users")
    .select("notif_push, notif_email, notif_sms, email")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  return (
    <div className="px-5 pt-10 pb-8">
      <Link href="/pro/me" className="text-bone/60 text-sm">
        ← Profile
      </Link>
      <Eyebrow className="!text-bone/60 mt-4" prefix={null}>
        Settings
      </Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">SETTINGS</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-6" />

      <div className="bg-white/5 p-5 mb-3">
        <div className="font-mono text-[10px] uppercase tracking-wider text-bone/60 mb-1">
          Account
        </div>
        <div className="text-sm">{me?.email ?? user?.email}</div>
      </div>

      <NotificationToggles
        initial={{
          push: me?.notif_push ?? true,
          email: me?.notif_email ?? true,
          sms: me?.notif_sms ?? true,
        }}
      />

      <div className="space-y-2 mt-6">
        <Link href="/pro/me/edit" className="block bg-white/5 p-4 text-sm hover:bg-white/10">
          Edit profile →
        </Link>
        <Link href="/pro/verify" className="block bg-white/5 p-4 text-sm hover:bg-white/10">
          Verification status →
        </Link>
        <Link href="/pro/help" className="block bg-white/5 p-4 text-sm hover:bg-white/10">
          Help & support →
        </Link>
        <Link href="/pro/tax" className="block bg-white/5 p-4 text-sm hover:bg-white/10">
          Tax summary →
        </Link>
      </div>

      <form action="/api/auth/sign-out" method="post" className="mt-10">
        <button
          type="submit"
          className="w-full bg-bad/20 text-bad py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-bad hover:text-bone transition"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

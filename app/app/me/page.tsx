import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { createClient } from "@/lib/supabase/server";

export default async function MePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const sections = [
    { h: "Account", items: [{ l: "Profile", href: "#" }, { l: "Email", href: "#" }, { l: "2FA", href: "#" }] },
    { h: "Booking", items: [{ l: "Garage", href: "/app/garage" }, { l: "Places", href: "/app/places" }, { l: "Trips", href: "/app/trips" }, { l: "Wallet", href: "/app/wallet" }] },
    { h: "Trust", items: [{ l: "Damage claims", href: "/safety" }, { l: "Refer a friend · $25", href: "#" }] },
    { h: "Support", items: [{ l: "Help", href: "/help" }, { l: "Contact", href: "mailto:hello@sheen.co" }] },
  ];

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-4 mb-7">
        <div className="w-14 h-14 rounded-full bg-cobalt text-bone flex items-center justify-center display text-xl">
          {(profile?.full_name ?? "U")[0]}
        </div>
        <div>
          <div className="display text-2xl">{profile?.full_name ?? "You"}</div>
          <div className="text-xs text-smoke">{profile?.email}</div>
        </div>
      </div>

      <div className="space-y-7">
        {sections.map((s) => (
          <div key={s.h}>
            <Eyebrow>{s.h}</Eyebrow>
            <div className="mt-2 space-y-1">
              {s.items.map((i) => (
                <Link key={i.l} href={i.href} className="flex justify-between p-3 hover:bg-mist text-sm">
                  <span>{i.l}</span>
                  <span className="text-smoke">→</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <form action="/api/auth/sign-out" method="post" className="mt-8">
        <button type="submit" className="text-sm text-bad underline">
          Sign out
        </button>
      </form>
    </div>
  );
}

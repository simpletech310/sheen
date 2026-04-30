import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const sections = [
    {
      h: "Membership",
      items: [
        { l: "Sheen+ plans", href: "/app/membership" },
        { l: "Achievements", href: "/app/me/achievements" },
      ],
    },
    {
      h: "Booking",
      items: [
        { l: "Garage", href: "/app/garage" },
        { l: "Places", href: "/app/places" },
        { l: "Washes", href: "/app/washes" },
        { l: "Wallet", href: "/app/wallet" },
      ],
    },
    {
      h: "Trust",
      items: [
        // Damage claims start from a specific wash — point at the wash list.
        { l: "Damage claims", href: "/app/washes" },
        { l: "Refer a friend · $25", href: "/app/me/refer" },
      ],
    },
    {
      h: "Support",
      items: [
        { l: "Help", href: "/help" },
        { l: "Safety standards", href: "/safety" },
        { l: "Contact", href: "mailto:hello@sheen.co" },
      ],
    },
  ];

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-4 mb-3">
        <div className="w-14 h-14 rounded-full bg-royal text-bone flex items-center justify-center display text-xl">
          {(profile?.full_name ?? "U")[0]}
        </div>
        <div className="flex-1">
          <div className="display text-2xl">{profile?.full_name ?? "You"}</div>
          <div className="text-xs text-smoke">{profile?.email}</div>
        </div>
      </div>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-7" />

      <div className="space-y-7">
        {sections.map((s) => (
          <div key={s.h}>
            <Eyebrow>{s.h}</Eyebrow>
            <div className="mt-2 -mx-2 space-y-1">
              {s.items.map((i) => (
                <Link
                  key={i.l}
                  href={i.href}
                  className="flex justify-between items-center px-3 py-3 hover:bg-mist text-sm transition group"
                >
                  <span>{i.l}</span>
                  <span className="text-smoke group-hover:text-royal transition">→</span>
                </Link>
              ))}
            </div>
          </div>
        ))}

        <div>
          <Eyebrow>Account</Eyebrow>
          <div className="mt-2 -mx-2 space-y-1">
            <form action="/api/auth/sign-out" method="post">
              <button
                type="submit"
                className="w-full text-left flex justify-between items-center px-3 py-3 hover:bg-mist text-sm transition group"
              >
                <span className="text-bad">Sign out</span>
                <span className="text-smoke group-hover:text-bad transition">→</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="mt-12 text-[10px] font-mono uppercase tracking-wider text-smoke text-center">
        SHEEN · Los Angeles
      </div>
    </div>
  );
}

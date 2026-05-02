import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { EnablePushButton } from "@/components/PWARegister";
import { LanguagePicker } from "@/components/i18n/LanguagePicker";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? "";

  // Pull a few summary stats so the header card carries real info.
  const [
    { data: profile },
    { data: ledger },
    { count: washCount },
    { data: membership },
    { count: badgeCount },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("loyalty_ledger")
      .select("points")
      .eq("user_id", userId),
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("customer_id", userId)
      .eq("status", "completed"),
    supabase
      .from("memberships")
      .select("status, membership_plans(display_name)")
      .eq("user_id", userId)
      .in("status", ["active", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("user_achievements")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const balance = (ledger ?? []).reduce(
    (acc, r: any) => acc + (r.points ?? 0),
    0
  );
  const creditDollars = (balance / 100).toFixed(2);
  const planName = (membership as any)?.membership_plans?.display_name as string | undefined;

  // Section model — kept flat with descriptive subtitles so users see at
  // a glance what each tile leads to.
  type Tile = {
    label: string;
    href: string;
    sub?: string;
    cta?: boolean;
  };
  const sections: { title: string; eyebrow: string; tiles: Tile[] }[] = [
    {
      title: "BOOKING",
      eyebrow: "Trip prep",
      tiles: [
        { label: "Garage", href: "/app/garage", sub: "Vehicles & big rigs" },
        { label: "Places", href: "/app/places", sub: "Saved addresses" },
        { label: "Recurring", href: "/app/me/recurring", sub: "Auto-rebook routines" },
        { label: "Washes", href: "/app/washes", sub: "Trip history" },
      ],
    },
    {
      title: "PAYMENTS",
      eyebrow: "Money",
      tiles: [
        { label: "Wallet", href: "/app/wallet", sub: "Points · membership · fees" },
        { label: "Payment methods", href: "/app/me/payment-methods", sub: "Cards on file" },
        { label: "Sheen+ plans", href: "/app/membership", sub: "Save 20%+ monthly", cta: true },
      ],
    },
    {
      title: "REWARDS",
      eyebrow: "You earn this",
      tiles: [
        { label: "Achievements", href: "/app/me/achievements", sub: "Badges unlocked" },
        { label: "Refer a friend", href: "/app/me/refer", sub: "$25 each side" },
      ],
    },
    {
      title: "TRUST",
      eyebrow: "We've got you",
      tiles: [
        { label: "File a claim", href: "/app/washes", sub: "From a recent wash" },
        { label: "Safety standards", href: "/safety" },
        { label: "Help & support", href: "mailto:hello@sheen.co" },
      ],
    },
  ];

  return (
    <div className="px-5 pt-10 pb-8">
      {/* Identity card — branded surface, real numbers, edit affordance. */}
      <div className="relative bg-royal text-bone p-6 mb-6 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-bone text-royal flex items-center justify-center display text-xl flex-shrink-0">
            {(profile?.full_name ?? user?.email ?? "U")[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="display text-2xl truncate">
              {profile?.full_name ?? "You"}
            </div>
            <div className="text-xs opacity-75 truncate">{profile?.email}</div>
          </div>
          <Link
            href="/app/me/profile"
            className="font-mono text-[10px] uppercase tracking-wider text-sol hover:text-bone shrink-0"
          >
            Edit →
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">
              Points
            </div>
            <div className="display tabular text-2xl mt-1 leading-none">
              {balance.toLocaleString()}
            </div>
            <div className="text-[10px] tabular opacity-60 mt-0.5">
              ≈ ${creditDollars}
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">
              Washes
            </div>
            <div className="display tabular text-2xl mt-1 leading-none">
              {washCount ?? 0}
            </div>
            <div className="text-[10px] tabular opacity-60 mt-0.5">
              completed
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">
              Badges
            </div>
            <div className="display tabular text-2xl mt-1 leading-none">
              {badgeCount ?? 0}
            </div>
            <div className="text-[10px] tabular opacity-60 mt-0.5">
              unlocked
            </div>
          </div>
        </div>

        {/* Membership pill — shown only when active. */}
        {planName && (
          <div className="mt-5 inline-flex items-center gap-2 bg-sol/15 border border-sol/40 px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sol" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-sol">
              SHEEN+ {planName} active
            </span>
          </div>
        )}
      </div>

      {/* Sections — clean grouped tiles, no dense list. */}
      <div className="space-y-7">
        {sections.map((s) => (
          <section key={s.title}>
            <Eyebrow>{s.eyebrow}</Eyebrow>
            <h2 className="display text-xl mt-2 mb-3">{s.title}</h2>
            <div className="grid grid-cols-1 gap-2">
              {s.tiles.map((t) => (
                <Link
                  key={t.label}
                  href={t.href}
                  className={`group flex items-center justify-between p-4 transition border ${
                    t.cta
                      ? "bg-sol border-sol text-ink hover:bg-bone"
                      : "bg-bone border-mist hover:border-ink hover:bg-mist/30"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold uppercase tracking-wide">
                      {t.label}
                    </div>
                    {t.sub && (
                      <div
                        className={`text-xs mt-0.5 ${
                          t.cta ? "text-ink/75" : "text-smoke"
                        }`}
                      >
                        {t.sub}
                      </div>
                    )}
                  </div>
                  <span
                    className={`shrink-0 ml-3 transition ${
                      t.cta
                        ? "text-ink"
                        : "text-smoke group-hover:text-royal"
                    }`}
                  >
                    →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Notifications & home-screen install — surfaced here so users who
          dismissed the welcome flow can still wire it up later. */}
      <section className="mt-7">
        <Eyebrow>App</Eyebrow>
        <h2 className="display text-xl mt-2 mb-3">Notifications &amp; home screen</h2>
        <div className="bg-bone border border-mist p-4">
          <p className="text-xs text-smoke leading-relaxed mb-3">
            Get pinged when your wash is matched, on the way, and done. Pin Sheen to your
            home screen and it opens like a real app — no App Store, no install size.
          </p>
          <div className="flex flex-wrap gap-2">
            <EnablePushButton />
            <a
              href="?welcome=1"
              className="inline-block bg-ink text-bone px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-royal transition"
            >
              Add to home screen
            </a>
          </div>
        </div>
      </section>

      {/* Language — writes the NEXT_LOCALE cookie + persists to users.locale
          via PATCH /api/users/me, then hard-reloads so the entire SSR tree
          renders in the new language. Same picker mounted on the marketing
          surface; this lives here so signed-in customers can change it
          without going back to /. */}
      <section className="mt-7">
        <Eyebrow>Preferences</Eyebrow>
        <h2 className="display text-xl mt-2 mb-3">Language</h2>
        <div className="bg-bone border border-mist p-4 flex items-center justify-between gap-4">
          <p className="text-xs text-smoke leading-relaxed flex-1">
            Pick the language you read in. Saved to your account so it
            follows you across devices. Chat messages from your pro stay
            translated either way.
          </p>
          <LanguagePicker variant="light" />
        </div>
      </section>

      {/* Sign-out — quiet, but on-brand */}
      <form action="/api/auth/sign-out" method="post" className="mt-10">
        <button
          type="submit"
          className="w-full py-3.5 text-sm font-bold uppercase tracking-wide bg-mist/30 text-bad hover:bg-bad hover:text-bone transition border border-mist"
        >
          Sign out
        </button>
      </form>

      <div className="mt-10 font-mono text-[10px] uppercase tracking-wider text-smoke text-center">
        SHEEN · Los Angeles
      </div>
    </div>
  );
}

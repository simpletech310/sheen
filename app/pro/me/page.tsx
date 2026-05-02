import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { EnablePushButton } from "@/components/PWARegister";
import { LanguagePicker } from "@/components/i18n/LanguagePicker";
import { fmtUSD } from "@/lib/pricing";
import { WashHandleCard } from "./WashHandleCard";
import { BigRigCapabilityCard } from "./BigRigCapabilityCard";

export const dynamic = "force-dynamic";

export default async function ProMePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? "";

  const [{ data: wp }, { data: me }, { data: lifetime }] = await Promise.all([
    supabase
      .from("washer_profiles")
      .select(
        "status, stripe_account_id, jobs_completed, rating_avg, wash_handle, background_check_verified, can_wash_big_rig, bio, service_radius_miles, insurance_doc_url, background_check_status"
      )
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("users")
      .select("full_name, display_name, avatar_url, email")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("payouts")
      .select("amount_cents, status")
      .eq("washer_id", userId)
      .in("status", ["paid", "pending"]),
  ]);

  const lifetimeCents = (lifetime ?? []).reduce(
    (a, p: any) => a + (p.amount_cents ?? 0),
    0
  );

  // Verification snapshot — three booleans drive a single status pill.
  const stripeOk = !!wp?.stripe_account_id;
  const insOk = !!wp?.insurance_doc_url;
  const bgOk = !!wp?.background_check_verified;
  const verifiedAll = stripeOk && insOk && bgOk;
  const verifiedCount = [stripeOk, insOk, bgOk].filter(Boolean).length;

  type Tile = { label: string; href: string; sub?: string; tone?: "sol" | "muted" };
  const sections: { title: string; eyebrow: string; tiles: Tile[] }[] = [
    {
      title: "WORK",
      eyebrow: "Day to day",
      tiles: [
        { label: "Today's queue", href: "/pro/queue", sub: "Open jobs in radius" },
        { label: "Schedule", href: "/pro/availability", sub: "Hours + block-out dates" },
        { label: "Inbox", href: "/pro/messages", sub: "Customer threads" },
      ],
    },
    {
      title: "MONEY",
      eyebrow: "Earnings",
      tiles: [
        { label: "Earnings", href: "/pro/earnings", sub: "12-week trend" },
        { label: "Wallet", href: "/pro/wallet", sub: "Pending + paid payouts" },
        { label: "Tax summary", href: "/pro/tax", sub: "Annual breakdown" },
      ],
    },
    {
      title: "TRUST",
      eyebrow: "Reputation",
      tiles: [
        { label: "Reviews", href: "/pro/reviews", sub: "Customer ratings" },
        { label: "Penalties", href: "/pro/penalties", sub: "Open + history" },
        {
          label: verifiedAll ? "Verification" : "Finish verification",
          href: "/pro/verify",
          sub: verifiedAll ? "All three steps clear" : `${verifiedCount}/3 done · finish to go active`,
          tone: verifiedAll ? "muted" : "sol",
        },
      ],
    },
    {
      title: "ACCOUNT",
      eyebrow: "Settings",
      tiles: [
        { label: "Edit profile", href: "/pro/me/edit", sub: "Bio, radius, equipment" },
        { label: "Settings", href: "/pro/settings", sub: "Notifications, sign out" },
        { label: "Help", href: "/pro/help", sub: "FAQ + support ticket" },
      ],
    },
  ];

  return (
    <div className="px-5 pt-10 pb-8">
      {/* Identity card — dark royal hero with sol gold accent + real numbers. */}
      <div className="relative bg-royal text-bone p-6 mb-6 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
        <div className="flex items-center gap-4 mb-5">
          {(() => {
            const avatarUrl = (me as any)?.avatar_url
              ? `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/avatars/${(me as any).avatar_url}`
              : null;
            const displayedName =
              (me as any)?.display_name || me?.full_name || me?.email || "Pro";
            return avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={avatarUrl}
                alt={displayedName}
                className="w-14 h-14 rounded-full object-cover bg-bone flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-bone text-royal flex items-center justify-center display text-xl flex-shrink-0">
                {displayedName[0]?.toUpperCase()}
              </div>
            );
          })()}
          <div className="flex-1 min-w-0">
            <div className="display text-2xl truncate">
              {(me as any)?.display_name || me?.full_name || "Pro"}
            </div>
            <div className="text-xs opacity-75 truncate">{me?.email}</div>
          </div>
          <Link
            href="/pro/me/edit"
            className="font-mono text-[10px] uppercase tracking-wider text-sol hover:text-bone shrink-0"
          >
            Edit →
          </Link>
        </div>

        {/* Status row — Active/Pending pill + key flags. */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span
            className={`font-mono text-[10px] uppercase tracking-wider px-2 py-1 ${
              wp?.status === "active"
                ? "bg-sol text-ink"
                : "bg-bone/15 text-bone/80"
            }`}
          >
            {wp?.status === "active" ? "Active" : (wp?.status ?? "Pending")}
          </span>
          {bgOk && (
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 bg-bone/15 text-bone/80">
              ✓ Verified
            </span>
          )}
          {wp?.can_wash_big_rig && (
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 bg-bone/15 text-bone/80">
              Big rig
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">
              Jobs
            </div>
            <div className="display tabular text-2xl mt-1 leading-none">
              {wp?.jobs_completed ?? 0}
            </div>
            <div className="text-[10px] tabular opacity-60 mt-0.5">lifetime</div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">
              Rating
            </div>
            <div className="display tabular text-2xl mt-1 leading-none">
              {wp?.rating_avg ?? "—"}
              <span className="text-sol ml-1 text-base">★</span>
            </div>
            <div className="text-[10px] tabular opacity-60 mt-0.5">
              avg score
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">
              Earnings
            </div>
            <div className="display tabular text-2xl mt-1 leading-none">
              {fmtUSD(lifetimeCents)}
            </div>
            <div className="text-[10px] tabular opacity-60 mt-0.5">lifetime</div>
          </div>
        </div>
      </div>

      {/* Bio block — quick "this is me" surface, only when set. */}
      {wp?.bio && (
        <p className="text-sm text-bone/80 mb-6 leading-relaxed bg-white/5 p-4 border-l-2 border-sol">
          {wp.bio}
        </p>
      )}

      {/* Wash handle + big rig — keep these as standalone cards
          since each has its own editor logic. */}
      {wp?.wash_handle && (
        <div className="mb-3">
          <WashHandleCard handle={wp.wash_handle} />
        </div>
      )}
      <div className="mb-7">
        <BigRigCapabilityCard initialCapable={!!wp?.can_wash_big_rig} />
      </div>

      {/* Sectioned tile groups, mirroring /app/me. */}
      <div className="space-y-7">
        {sections.map((s) => (
          <section key={s.title}>
            <Eyebrow className="!text-bone/60" prefix={null}>
              {s.eyebrow}
            </Eyebrow>
            <h2 className="display text-xl mt-2 mb-3">{s.title}</h2>
            <div className="grid grid-cols-1 gap-2">
              {s.tiles.map((t) => (
                <Link
                  key={t.label}
                  href={t.href}
                  className={`group flex items-center justify-between p-4 transition border ${
                    t.tone === "sol"
                      ? "bg-sol border-sol text-ink hover:bg-bone"
                      : "bg-white/5 border-bone/10 hover:border-bone/30 hover:bg-white/10"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold uppercase tracking-wide">
                      {t.label}
                    </div>
                    {t.sub && (
                      <div
                        className={`text-xs mt-0.5 ${
                          t.tone === "sol" ? "text-ink/75" : "text-bone/55"
                        }`}
                      >
                        {t.sub}
                      </div>
                    )}
                  </div>
                  <span
                    className={`shrink-0 ml-3 transition ${
                      t.tone === "sol" ? "text-ink" : "text-bone/40 group-hover:text-sol"
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

      {/* App-shell controls — push notifications + home-screen install. */}
      <section className="mt-7">
        <Eyebrow className="!text-bone/60" prefix={null}>App</Eyebrow>
        <h2 className="display text-xl mt-2 mb-3 text-bone">Notifications &amp; home screen</h2>
        <div className="bg-white/5 border border-bone/10 p-4">
          <p className="text-xs text-bone/65 leading-relaxed mb-3">
            Hear new jobs the second they post. Pin Sheen Pro to your home screen — opens
            like a native app, no App Store, no install size.
          </p>
          <div className="flex flex-wrap gap-2">
            <EnablePushButton />
            <a
              href="?welcome=1"
              className="inline-block bg-sol text-ink px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-bone transition"
            >
              Add to home screen
            </a>
          </div>
        </div>
      </section>

      {/* Language — writes the NEXT_LOCALE cookie + persists to users.locale
          via PATCH /api/users/me. Push notifications (matched, complete,
          tip received) auto-translate to this locale via lib/push.ts; chat
          messages from English-speaking customers also translate to your
          language on the client side. */}
      <section className="mt-7">
        <Eyebrow className="!text-bone/60" prefix={null}>Preferences</Eyebrow>
        <h2 className="display text-xl mt-2 mb-3 text-bone">Language</h2>
        <div className="bg-white/5 border border-bone/10 p-4 flex items-center justify-between gap-4">
          <p className="text-xs text-bone/65 leading-relaxed flex-1">
            Pick the language you read in. Saved to your account so it follows
            you across devices. Customer chat translates to here automatically.
          </p>
          <LanguagePicker variant="dark" />
        </div>
      </section>

      <Link
        href="/pro/settings"
        className="mt-8 block text-center text-xs uppercase tracking-wider text-bone/50 hover:text-bone"
      >
        Settings &amp; sign out →
      </Link>

      <div className="mt-8 font-mono text-[10px] uppercase tracking-wider text-bone/30 text-center">
        SHEEN PRO · Los Angeles
      </div>
    </div>
  );
}

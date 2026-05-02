"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { LanguagePicker } from "@/components/i18n/LanguagePicker";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/Toast";
import { getDefaultLandingForRole } from "@/lib/auth-redirect";

function SignUpInner() {
  const router = useRouter();
  const params = useSearchParams();
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const role = params.get("role") || "customer";
  const isWasher = role === "washer";
  const isPartner = role === "partner_owner";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const supabase = createClient();
    // Use the env'd public URL so the email-confirmation link points
    // at production, not localhost. Falls back to the current origin
    // if the env isn't set (local dev).
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    // Pass role through ?next= so the auth callback knows where to
    // route post-confirmation. The DB trigger reads role from
    // raw_user_meta_data so the public.users row is created with the
    // right role on first auth, but we still need a destination.
    const next = isWasher ? "/pro/onboard" : isPartner ? "/partner/apply" : "/app";
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, role },
        emailRedirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      toast(error.message, "error");
      return;
    }
    if (data.session) {
      // Update role on public.users immediately so getDefaultLandingForRole works.
      await supabase.from("users").update({ full_name: name, role }).eq("id", data.user!.id);
      toast(t("welcome"), "success");
      // Tag the destination with ?welcome=1 so the install + push welcome
      // flow fires once on first paint. Mirrors /auth/callback's behaviour.
      const withWelcome = (path: string) =>
        `${path}${path.includes("?") ? "&" : "?"}welcome=1`;
      if (isWasher) router.push(withWelcome("/pro/onboard"));
      else if (isPartner) router.push(withWelcome("/partner/apply"));
      else router.push(withWelcome(getDefaultLandingForRole(role)));
      router.refresh();
    } else {
      setErr(t("checkEmail"));
      toast(t("checkEmail"), "info");
    }
  }

  // Single ink+royal full-bleed treatment for every variant — matches
  // /sign-in. Per-role copy + hero image differentiates the surfaces.
  const heroImg = isWasher
    ? "/img/washer.jpg"
    : isPartner
    ? "/img/business.jpg"
    : "/img/hero.jpg";
  const overlay = isWasher
    ? "bg-gradient-to-b from-ink/85 via-ink/75 to-ink"
    : "bg-gradient-to-br from-royal/85 via-ink/85 to-ink";
  const eyebrow = isWasher
    ? t("applyToWash")
    : isPartner
    ? t("partnerSignUp")
    : t("createAccount");
  const headlineTop = isWasher
    ? t("headlineWasherA")
    : isPartner
    ? t("headlinePartnerA")
    : t("headlineCustomerA");
  const headlineAccent = isWasher
    ? t("headlineWasherB")
    : isPartner
    ? t("headlinePartnerB")
    : t("headlineCustomerB");
  const subline = isWasher
    ? t("sublineWasher")
    : isPartner
    ? t("sublinePartner")
    : t("sublineCustomer");
  const ctaLabel = isWasher
    ? t("ctaWasher")
    : isPartner
    ? t("ctaPartner")
    : t("ctaCustomer");

  const inputCls =
    "w-full px-4 py-3.5 bg-white/5 border border-bone/15 text-bone placeholder:text-bone/40 text-sm focus:outline-none focus:border-sol transition";
  const buttonCls =
    "w-full bg-sol text-ink py-4 text-sm font-bold uppercase tracking-wide hover:bg-bone disabled:opacity-50 transition";

  return (
    <div className="min-h-screen bg-ink text-bone flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Hero image */}
      <div
        className="absolute inset-0 z-0 opacity-30"
        style={{
          backgroundImage: `url(${heroImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* Brand gradient overlay — royal-to-ink for customer/partner,
          straight ink for washer (matches Sheen Pro dark icon). */}
      <div className={`absolute inset-0 z-0 ${overlay}`} />

      <div className="w-full max-w-md relative z-10">
        <div className="flex items-center justify-between mb-10">
          <Link href="/" className="inline-block">
            <Wordmark size={30} invert />
          </Link>
          <LanguagePicker variant="dark" />
        </div>

        <div className="font-mono text-[11px] uppercase tracking-wider mb-3 text-sol">
          ── {eyebrow}
        </div>
        <h1 className="display text-[44px] md:text-[52px] leading-tight mb-2">
          {headlineTop}
          <br />
          <span className="text-sol">{headlineAccent}</span>
        </h1>
        <div className="h-[3px] w-16 bg-sol mb-5" />
        <p className="text-sm text-bone/70 mb-8 leading-relaxed">{subline}</p>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="text"
            placeholder={t("fullName")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            className={inputCls}
          />
          <input
            type="email"
            placeholder={t("email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className={inputCls}
          />
          <input
            type="password"
            placeholder={t("password")}
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className={inputCls}
          />
          {err && (
            <div className="text-sm text-bad bg-bad/10 border-l-2 border-bad px-3 py-2">
              {err}
            </div>
          )}
          <button type="submit" disabled={loading} className={buttonCls}>
            {loading ? t("creating") : ctaLabel}
          </button>
        </form>

        <div className="mt-7 space-y-2.5 text-sm">
          <p className="text-bone/70">
            {t("haveAccount")}{" "}
            <Link
              href={isWasher ? "/sign-in?role=washer" : "/sign-in"}
              className="text-sol underline font-bold"
            >
              {tc("signIn")}
            </Link>
          </p>
          {!isWasher && !isPartner && (
            <p className="text-xs text-bone/50">
              Want to wash for Sheen?{" "}
              <Link href="/sign-up?role=washer" className="text-bone/80 underline">
                {t("applyAsPro")}
              </Link>
            </p>
          )}
          {isWasher && (
            <p className="text-xs text-bone/50">
              <Link href="/sign-up" className="text-bone/80 underline">
                {t("customerSignUp")}
              </Link>
            </p>
          )}
        </div>

        {/* Quiet trust footer — matches /sign-in. Anchors the surface
            and answers the unspoken "is this legit" question. */}
        <div className="mt-12 pt-6 border-t border-bone/10 grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-bone/50">
              {t("trustInsured")}
            </div>
            <div className="display tabular text-base text-bone mt-1">{t("trust1MGL")}</div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-bone/50">
              {t("trustDamageCover")}
            </div>
            <div className="display tabular text-base text-bone mt-1">{t("trust2500")}</div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-bone/50">
              {t("trustTips")}
            </div>
            <div className="display tabular text-base text-bone mt-1">{t("trust100Percent")}</div>
          </div>
        </div>

        {/* Legal — quiet, last thing on the surface. */}
        <p className="text-[10px] text-bone/40 text-center mt-6 leading-relaxed">
          {t("termsPrefix")}{" "}
          <Link href="/legal/tos" className="underline hover:text-bone">
            {t("termsLink")}
          </Link>{" "}
          {t("and")}{" "}
          <Link href="/legal/privacy" className="underline hover:text-bone">
            {t("privacyLink")}
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpInner />
    </Suspense>
  );
}

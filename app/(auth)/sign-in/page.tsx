"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/Toast";
import { getDefaultLandingForRole } from "@/lib/auth-redirect";

function SignInInner() {
  const router = useRouter();
  const params = useSearchParams();
  const explicitNext = params.get("next");
  const role = params.get("role");
  const isWasher = role === "washer";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setLoading(false);
      setErr(error.message);
      toast(error.message, "error");
      return;
    }
    let dest = explicitNext;
    if (!dest && data.user) {
      const { data: row } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      dest = getDefaultLandingForRole((row as any)?.role);
    }
    setLoading(false);
    toast("Welcome back", "success");
    router.push(dest || "/app");
    router.refresh();
  }

  // Both surfaces are now full-bleed image heroes — washer hero is
  // /img/washer.jpg with a sol-gold accent, customer hero is the
  // hero shot with a royal gradient. Same depth + brand presence on
  // both; copy + accent color is what differentiates them.
  const heroImg = isWasher ? "/img/washer.jpg" : "/img/hero.jpg";
  const accent = isWasher ? "bg-sol" : "bg-sol";
  const eyebrowColor = isWasher ? "text-sol" : "text-sol";
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
      {/* Royal-to-ink gradient overlay matches the home hero treatment. */}
      <div
        className={`absolute inset-0 z-0 ${
          isWasher
            ? "bg-gradient-to-b from-ink/85 via-ink/75 to-ink"
            : "bg-gradient-to-br from-royal/85 via-ink/85 to-ink"
        }`}
      />

      <div className="w-full max-w-md relative z-10">
        <Link href="/" className="inline-block mb-10">
          <Wordmark size={30} invert />
        </Link>

        <div className={`font-mono text-[11px] uppercase tracking-wider mb-3 ${eyebrowColor}`}>
          ── {isWasher ? "Pro sign-in" : "Customer sign-in"}
        </div>
        <h1 className="display text-[44px] md:text-[52px] leading-tight mb-2">
          {isWasher ? "WELCOME BACK," : "MAKE IT"}
          <br />
          <span className="text-sol">
            {isWasher ? "PRO." : "LOOK SHARP."}
          </span>
        </h1>
        <div className={`h-[3px] w-16 ${accent} mb-5`} />
        <p className="text-sm text-bone/70 mb-8 leading-relaxed">
          {isWasher
            ? "Sign in to your queue, schedule, and earnings."
            : "Sign in to book a wash, track a pro, or manage your garage."}
        </p>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className={inputCls}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className={inputCls}
          />
          {err && (
            <div className="text-sm text-bad bg-bad/10 border-l-2 border-bad px-3 py-2">
              {err}
            </div>
          )}
          <button type="submit" disabled={loading} className={buttonCls}>
            {loading ? "Signing in…" : "Sign in →"}
          </button>
        </form>

        {isWasher ? (
          <div className="mt-7 space-y-2.5 text-sm">
            <p className="text-bone/70">
              New here?{" "}
              <Link href="/sign-up?role=washer" className="text-sol underline font-bold">
                Apply to wash →
              </Link>
            </p>
            <p className="text-xs text-bone/50">
              Customer?{" "}
              <Link href="/sign-in" className="text-bone/80 underline">
                Customer sign-in
              </Link>
            </p>
          </div>
        ) : (
          <div className="mt-7 space-y-2.5 text-sm">
            <p className="text-bone/70">
              New to Sheen?{" "}
              <Link href="/sign-up" className="text-sol underline font-bold">
                Create an account →
              </Link>
            </p>
            <p className="text-xs text-bone/50">
              Are you a washer?{" "}
              <Link href="/sign-in?role=washer" className="text-bone/80 underline">
                Pro sign-in
              </Link>
            </p>
          </div>
        )}

        {/* Quiet trust footer — keeps the surface anchored. */}
        <div className="mt-12 pt-6 border-t border-bone/10 grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-bone/50">
              Insured
            </div>
            <div className="display tabular text-base text-bone mt-1">$1M GL</div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-bone/50">
              Damage cover
            </div>
            <div className="display tabular text-base text-bone mt-1">$2,500</div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-bone/50">
              Tips
            </div>
            <div className="display tabular text-base text-bone mt-1">100%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInInner />
    </Suspense>
  );
}

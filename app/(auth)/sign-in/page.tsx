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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setErr(error.message);
      toast(error.message, "error");
      return;
    }
    // Resolve where to send them — explicit ?next wins, otherwise route by role.
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

  // Themed surfaces — washer mode flips to dark ink + sol gold.
  const wrap = isWasher
    ? "min-h-screen bg-ink text-bone flex items-center justify-center px-6 py-16 relative overflow-hidden"
    : "min-h-screen bg-bone flex items-center justify-center px-6 py-16";
  const inputCls = isWasher
    ? "w-full px-4 py-3.5 bg-white/5 border border-bone/15 text-bone placeholder:text-bone/40 rounded-md text-sm focus:outline-none focus:border-sol"
    : "w-full px-4 py-3.5 bg-bone border border-mist rounded-md text-sm focus:outline-none focus:border-ink";
  const buttonCls = isWasher
    ? "w-full bg-sol text-ink rounded-full py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-bone transition disabled:opacity-50"
    : "w-full bg-ink text-bone rounded-full py-3.5 text-sm font-semibold disabled:opacity-50";

  return (
    <div className={wrap}>
      {isWasher && (
        <div
          className="absolute inset-0 z-0 opacity-25"
          style={{
            backgroundImage: "url(/img/washer.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
      {isWasher && <div className="absolute inset-0 z-0 bg-gradient-to-b from-ink/85 via-ink/70 to-ink" />}

      <div className="w-full max-w-md relative z-10">
        <Link href="/" className="inline-block mb-8">
          <Wordmark size={28} invert={isWasher} />
        </Link>
        {isWasher ? (
          <>
            <div className="font-mono text-[11px] uppercase tracking-wider text-sol mb-2">
              ── Pro sign-in
            </div>
            <h1 className="display text-4xl mb-2">WELCOME BACK, PRO.</h1>
            <div className="h-[3px] w-16 bg-sol mb-4" />
            <p className="text-sm text-bone/65 mb-8">
              Sign in to your queue, schedule, and earnings.
            </p>
          </>
        ) : (
          <>
            <h1 className="display text-4xl mb-2">Welcome back.</h1>
            <p className="text-sm text-smoke mb-8">Sign in to book, track, or pick up jobs.</p>
          </>
        )}
        <form onSubmit={submit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputCls}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={inputCls}
          />
          {err && <div className="text-sm text-bad">{err}</div>}
          <button type="submit" disabled={loading} className={buttonCls}>
            {loading ? "Signing in…" : isWasher ? "Sign in →" : "Sign in →"}
          </button>
        </form>

        {isWasher ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-bone/65">
              New here?{" "}
              <Link href="/sign-up?role=washer" className="text-sol underline">
                Apply to wash
              </Link>
            </p>
            <p className="text-xs text-bone/50">
              Customer?{" "}
              <Link href="/sign-in" className="text-bone/80 underline">
                Sign in here
              </Link>
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-smoke">
              New to Sheen?{" "}
              <Link href="/sign-up" className="text-ink underline">
                Create an account
              </Link>
            </p>
            <p className="text-xs text-smoke">
              Are you a washer?{" "}
              <Link href="/sign-in?role=washer" className="text-royal underline">
                Pro sign-in →
              </Link>
            </p>
          </div>
        )}
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

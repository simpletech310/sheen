"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/Toast";
import { getDefaultLandingForRole } from "@/lib/auth-redirect";

function SignUpInner() {
  const router = useRouter();
  const params = useSearchParams();
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, role },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
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
      toast("Account created — welcome to Sheen", "success");
      // Washers detour through onboarding before the dashboard.
      if (isWasher) router.push("/pro/onboard");
      else if (isPartner) router.push("/partner/apply");
      else router.push(getDefaultLandingForRole(role));
      router.refresh();
    } else {
      setErr("Check your email to confirm.");
      toast("Check your email to confirm your account", "info");
    }
  }

  const wrap = isWasher
    ? "min-h-screen bg-ink text-bone flex items-center justify-center px-6 py-16 relative overflow-hidden"
    : "min-h-screen bg-bone flex items-center justify-center px-6 py-16";
  const inputCls = isWasher
    ? "w-full px-4 py-3.5 bg-white/5 border border-bone/15 text-bone placeholder:text-bone/40 rounded-md text-sm focus:outline-none focus:border-sol"
    : "w-full px-4 py-3.5 bg-bone border border-mist rounded-md text-sm focus:outline-none focus:border-ink";
  const buttonCls = isWasher
    ? "w-full bg-sol text-ink rounded-full py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-bone disabled:opacity-50"
    : "w-full bg-ink text-bone rounded-full py-3.5 text-sm font-semibold disabled:opacity-50";

  return (
    <div className={wrap}>
      {isWasher && (
        <>
          <div
            className="absolute inset-0 z-0 opacity-25"
            style={{
              backgroundImage: "url(/img/washer.jpg)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute inset-0 z-0 bg-gradient-to-b from-ink/85 via-ink/70 to-ink" />
        </>
      )}
      <div className="w-full max-w-md relative z-10">
        <Link href="/" className="inline-block mb-8">
          <Wordmark size={28} invert={isWasher} />
        </Link>
        {isWasher ? (
          <>
            <div className="font-mono text-[11px] uppercase tracking-wider text-sol mb-2">
              ── Apply to wash
            </div>
            <h1 className="display text-4xl mb-2">JOIN THE FLEET.</h1>
            <div className="h-[3px] w-16 bg-sol mb-4" />
            <p className="text-sm text-bone/65 mb-8">
              2 minutes to apply. We verify ID + insurance before activation. Approved in 24–48h.
            </p>
          </>
        ) : (
          <>
            <h1 className="display text-4xl mb-2">
              {isPartner ? "Partner sign-up." : "Get sheened."}
            </h1>
            <p className="text-sm text-smoke mb-8">
              {isPartner
                ? "Set up your business profile. Verification takes ~48 hours."
                : "Save your places, vehicles, and payment methods."}
            </p>
          </>
        )}
        <form onSubmit={submit} className="space-y-4">
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={inputCls}
          />
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
            placeholder="Password (8+ chars)"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={inputCls}
          />
          {err && <div className="text-sm text-bad">{err}</div>}
          <button type="submit" disabled={loading} className={buttonCls}>
            {loading ? "Creating account…" : isWasher ? "Apply →" : "Create account →"}
          </button>
        </form>
        {isWasher ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-bone/65">
              Already a pro?{" "}
              <Link href="/sign-in?role=washer" className="text-sol underline">
                Sign in
              </Link>
            </p>
          </div>
        ) : (
          <p className="text-sm text-smoke mt-6">
            Have an account?{" "}
            <Link href="/sign-in" className="text-ink underline">
              Sign in
            </Link>
          </p>
        )}
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

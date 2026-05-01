"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/Toast";
import { getDefaultLandingForRole } from "@/lib/auth-redirect";

const MIN_PW = 8;

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [validSession, setValidSession] = useState<boolean | null>(null);

  // Recovery flow lands here with an active session created by the auth
  // callback's exchange. If that session isn't present (link expired,
  // direct visit), surface the issue rather than silently failing on submit.
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      setValidSession(!!data.session);
    })();
    return () => {
      alive = false;
    };
  }, [supabase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password.length < MIN_PW) {
      setErr(`Password must be at least ${MIN_PW} characters.`);
      return;
    }
    if (password !== confirm) {
      setErr("Passwords don't match.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) {
      setLoading(false);
      setErr(error.message);
      toast(error.message, "error");
      return;
    }
    // Look up role to land them in the right place. Safe lookup — recovery
    // session is fully authenticated for the reset itself.
    let dest = "/app";
    if (data.user) {
      const { data: row } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      dest = getDefaultLandingForRole((row as any)?.role);
    }
    setLoading(false);
    toast("Password updated — welcome back", "success");
    router.push(dest);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-ink text-bone flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div
        className="absolute inset-0 z-0 opacity-25"
        style={{
          backgroundImage: "url(/img/hero.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-royal/85 via-ink/85 to-ink" />

      <div className="w-full max-w-md relative z-10">
        <Link href="/" className="inline-block mb-10">
          <Wordmark size={30} invert />
        </Link>

        <div className="font-mono text-[11px] uppercase tracking-wider mb-3 text-sol">
          ── New password
        </div>
        <h1 className="display text-[44px] md:text-[52px] leading-tight mb-2">
          PICK A
          <br />
          <span className="text-sol">NEW ONE.</span>
        </h1>
        <div className="h-[3px] w-16 bg-sol mb-5" />

        {validSession === false ? (
          <div className="bg-bad/10 border-l-2 border-bad p-5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-bad mb-2">
              Link expired
            </div>
            <p className="text-sm text-bone/85 leading-relaxed">
              This reset link has expired or already been used. Request a new one — it&rsquo;ll arrive in a few seconds.
            </p>
            <Link
              href="/forgot-password"
              className="block w-full text-center bg-sol text-ink mt-5 py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-bone transition"
            >
              Send a new link →
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-bone/70 mb-8 leading-relaxed">
              {MIN_PW}+ characters. After this, sign in normally.
            </p>
            <form onSubmit={submit} className="space-y-3">
              <input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={MIN_PW}
                className="w-full px-4 py-3.5 bg-white/5 border border-bone/15 text-bone placeholder:text-bone/40 text-sm focus:outline-none focus:border-sol transition"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                minLength={MIN_PW}
                className="w-full px-4 py-3.5 bg-white/5 border border-bone/15 text-bone placeholder:text-bone/40 text-sm focus:outline-none focus:border-sol transition"
              />
              {err && (
                <div className="text-sm text-bad bg-bad/10 border-l-2 border-bad px-3 py-2">
                  {err}
                </div>
              )}
              <button
                type="submit"
                disabled={loading || !password || !confirm}
                className="w-full bg-sol text-ink py-4 text-sm font-bold uppercase tracking-wide hover:bg-bone disabled:opacity-50 transition"
              >
                {loading ? "Updating…" : "Update password →"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

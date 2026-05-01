"use client";

import { useState } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/Toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const supabase = createClient();
    // Use the env'd public URL so production reset emails never land on
    // localhost or a stale preview deploy.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/auth/callback?type=recovery`,
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      toast(error.message, "error");
      return;
    }
    setSent(true);
    toast("Check your email for the reset link", "success");
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
          ── Reset password
        </div>
        <h1 className="display text-[44px] md:text-[52px] leading-tight mb-2">
          FORGOT IT?
          <br />
          <span className="text-sol">NO PROBLEM.</span>
        </h1>
        <div className="h-[3px] w-16 bg-sol mb-5" />

        {sent ? (
          <div className="bg-bone/5 border border-bone/15 p-5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-sol mb-2">
              Check your inbox
            </div>
            <p className="text-sm text-bone/85 leading-relaxed">
              We sent a reset link to <span className="font-bold text-bone">{email}</span>. Tap it to set a new password.
            </p>
            <p className="text-xs text-bone/55 mt-3 leading-relaxed">
              The link works once and expires in an hour. Check your spam folder if it doesn&rsquo;t show up.
            </p>
            <Link
              href="/sign-in"
              className="block w-full text-center bg-sol text-ink mt-5 py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-bone transition"
            >
              Back to sign in →
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-bone/70 mb-8 leading-relaxed">
              Enter your email and we&rsquo;ll send you a link to set a new password.
            </p>
            <form onSubmit={submit} className="space-y-3">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3.5 bg-white/5 border border-bone/15 text-bone placeholder:text-bone/40 text-sm focus:outline-none focus:border-sol transition"
              />
              {err && (
                <div className="text-sm text-bad bg-bad/10 border-l-2 border-bad px-3 py-2">
                  {err}
                </div>
              )}
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-sol text-ink py-4 text-sm font-bold uppercase tracking-wide hover:bg-bone disabled:opacity-50 transition"
              >
                {loading ? "Sending…" : "Send reset link →"}
              </button>
            </form>
            <p className="text-xs text-bone/55 mt-6">
              Remembered it?{" "}
              <Link href="/sign-in" className="text-sol underline">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

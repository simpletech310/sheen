"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/Toast";

function SignInInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/app";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setErr(error.message);
      toast(error.message, "error");
      return;
    }
    toast("Welcome back", "success");
    router.push(next);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-bone flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-block mb-8">
          <Wordmark size={28} />
        </Link>
        <h1 className="display text-4xl mb-2">Welcome back.</h1>
        <p className="text-sm text-smoke mb-8">Sign in to book, track, or pick up jobs.</p>
        <form onSubmit={submit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3.5 bg-bone border border-mist rounded-md text-sm focus:outline-none focus:border-ink"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3.5 bg-bone border border-mist rounded-md text-sm focus:outline-none focus:border-ink"
          />
          {err && <div className="text-sm text-bad">{err}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-bone rounded-full py-3.5 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in →"}
          </button>
        </form>
        <p className="text-sm text-smoke mt-6">
          New to Sheen?{" "}
          <Link href="/sign-up" className="text-ink underline">
            Create an account
          </Link>
        </p>
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

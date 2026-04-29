"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { createClient } from "@/lib/supabase/client";

function SignUpInner() {
  const router = useRouter();
  const params = useSearchParams();
  const role = params.get("role") || "customer";
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
      return;
    }
    if (data.session) {
      // Update role on public.users immediately
      await supabase.from("users").update({ full_name: name, role }).eq("id", data.user!.id);
      if (role === "washer") router.push("/pro/onboard");
      else if (role === "partner_owner") router.push("/partner/apply");
      else router.push("/app");
      router.refresh();
    } else {
      setErr("Check your email to confirm.");
    }
  }

  return (
    <div className="min-h-screen bg-bone flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-block mb-8">
          <Wordmark size={28} />
        </Link>
        <h1 className="display text-4xl mb-2">
          {role === "washer" ? "Apply to wash." : role === "partner_owner" ? "Partner sign-up." : "Get sheened."}
        </h1>
        <p className="text-sm text-smoke mb-8">
          {role === "washer"
            ? "2 minutes. We verify ID + insurance before activation."
            : role === "partner_owner"
            ? "Set up your business profile. Verification takes ~48 hours."
            : "Save your places, vehicles, and payment methods."}
        </p>
        <form onSubmit={submit} className="space-y-4">
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-3.5 bg-bone border border-mist rounded-md text-sm focus:outline-none focus:border-ink"
          />
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
            placeholder="Password (8+ chars)"
            minLength={8}
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
            {loading ? "Creating account…" : "Create account →"}
          </button>
        </form>
        <p className="text-sm text-smoke mt-6">
          Have an account?{" "}
          <Link href="/sign-in" className="text-ink underline">
            Sign in
          </Link>
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

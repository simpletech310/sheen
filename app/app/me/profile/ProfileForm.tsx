"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";
import { AvatarUpload } from "@/components/customer/AvatarUpload";

export function ProfileForm({
  userId,
  initial,
}: {
  userId: string;
  initial: {
    full_name: string;
    display_name: string;
    email: string;
    phone: string;
    avatar_url: string | null;
  };
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initial.full_name);
  const [displayName, setDisplayName] = useState(initial.display_name);
  const [phone, setPhone] = useState(initial.phone);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          display_name: displayName || null,
          phone,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not save");
      toast("Profile updated", "success");
      router.push("/app/me");
      router.refresh();
    } catch (e: any) {
      toast(e.message || "Could not save", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Avatar — uploads on click, persists immediately. The form submit
          below only handles the text fields. */}
      <div>
        <label className="block font-mono text-[10px] uppercase tracking-wider text-smoke mb-2">
          Profile photo
        </label>
        <AvatarUpload
          userId={userId}
          initialPath={initial.avatar_url}
          initialName={displayName || fullName}
        />
      </div>

      <div>
        <label className="block font-mono text-[10px] uppercase tracking-wider text-smoke mb-1">
          Full name · for billing &amp; receipts
        </label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jane Doe"
          required
          className="w-full px-4 py-3.5 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
        />
      </div>

      <div>
        <label className="block font-mono text-[10px] uppercase tracking-wider text-smoke mb-1">
          Display name · what your pro sees in chat &amp; reviews
        </label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Jane"
          maxLength={60}
          className="w-full px-4 py-3.5 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
        />
        <div className="text-[11px] text-smoke mt-1">
          On public reviews we show first name + last initial (e.g. &ldquo;Jane D.&rdquo;).
        </div>
      </div>

      <div>
        <label className="block font-mono text-[10px] uppercase tracking-wider text-smoke mb-1">
          Email · sign-in identity
        </label>
        <input
          value={initial.email}
          disabled
          className="w-full px-4 py-3.5 bg-mist/50 border border-mist text-sm text-smoke"
        />
        <div className="text-[11px] text-smoke mt-1">
          Email is your sign-in identity. Contact support to change it.
        </div>
      </div>

      <div>
        <label className="block font-mono text-[10px] uppercase tracking-wider text-smoke mb-1">
          Phone · for SMS updates (optional)
        </label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(555) 123-4567"
          inputMode="tel"
          className="w-full px-4 py-3.5 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={busy}
          className="flex-1 bg-ink text-bone py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-royal disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

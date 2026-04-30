"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function VerifyButton({
  userId,
  verified,
}: {
  userId: string;
  verified: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (verified && !confirm("Un-verify this pro? They’ll lose the verified badge.")) {
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/admin/verify-washer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, verified: !verified }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        alert(d.error || "Failed");
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition disabled:opacity-50 ${
        verified
          ? "bg-good text-bone hover:bg-good/80"
          : "bg-mist text-ink hover:bg-ink hover:text-bone"
      }`}
    >
      {busy ? "…" : verified ? "✓ Verified" : "Verify"}
    </button>
  );
}

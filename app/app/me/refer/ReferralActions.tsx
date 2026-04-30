"use client";

import { useState } from "react";

export function ReferralActions({ code, shareUrl }: { code: string; shareUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "SHEEN",
          text: `Get $25 off your first wash with my code ${code}`,
          url: shareUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      copy();
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={share}
        className="bg-ink text-bone py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-royal"
      >
        Share
      </button>
      <button
        onClick={copy}
        className="bg-mist text-ink py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-mist/80"
      >
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}

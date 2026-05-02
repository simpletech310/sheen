"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function ReferralActions({ code, shareUrl }: { code: string; shareUrl: string }) {
  const t = useTranslations("appRefer");
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
          text: t("shareText", { code }),
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
        {t("share")}
      </button>
      <button
        onClick={copy}
        className="bg-mist text-ink py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-mist/80"
      >
        {copied ? t("copied") : t("copyLink")}
      </button>
    </div>
  );
}

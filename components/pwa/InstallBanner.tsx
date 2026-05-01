"use client";

import { useState } from "react";
import { useInstallPrompt } from "./useInstallPrompt";

type Variant = "customer" | "washer";

const COPY: Record<Variant, {
  text: string;
  cta: string;
  themeBg: string;
  themeText: string;
  themeCta: string;
  iconUrl: string;
  iosTip: string;
}> = {
  customer: {
    text: "Sheen on your phone is faster — pin it to your home screen.",
    cta: "Add it",
    themeBg: "bg-royal",
    themeText: "text-bone",
    themeCta: "bg-sol text-ink hover:bg-bone",
    iconUrl: "/icons/customer-192.png",
    iosTip: "Tap Share → Add to Home Screen",
  },
  washer: {
    text: "Pin Sheen Pro to your home screen — your queue, one tap.",
    cta: "Add it",
    themeBg: "bg-sol",
    themeText: "text-ink",
    themeCta: "bg-ink text-sol hover:bg-bone hover:text-ink",
    iconUrl: "/icons/washer-192.png",
    iosTip: "Tap Share → Add to Home Screen",
  },
};

export function InstallBanner({ variant }: { variant: Variant }) {
  const { canShowNudge, canPrompt, isIOS, prompt, dismiss } = useInstallPrompt();
  const [showIOSTip, setShowIOSTip] = useState(false);
  const copy = COPY[variant];

  if (!canShowNudge) return null;

  async function onAdd() {
    if (isIOS) {
      setShowIOSTip(true);
      return;
    }
    if (canPrompt) {
      await prompt();
    }
  }

  return (
    <div className={`${copy.themeBg} ${copy.themeText} px-4 py-3`}>
      <div className="max-w-md mx-auto flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={copy.iconUrl} alt="" className="w-9 h-9 rounded-lg shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs leading-snug">
            {showIOSTip ? copy.iosTip : copy.text}
          </div>
        </div>
        {!showIOSTip && (
          <button
            type="button"
            onClick={onAdd}
            disabled={!isIOS && !canPrompt}
            className={`shrink-0 ${copy.themeCta} px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition disabled:opacity-50`}
          >
            {copy.cta}
          </button>
        )}
        <button
          type="button"
          onClick={() => dismiss()}
          aria-label="Dismiss"
          className="shrink-0 opacity-70 hover:opacity-100 transition text-lg leading-none px-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

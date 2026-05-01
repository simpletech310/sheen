"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EnablePushButton } from "@/components/PWARegister";
import { useInstallPrompt } from "./useInstallPrompt";

// Set when the welcome flow has been shown for the current user. The query
// param is one-shot — we strip it after first paint so a refresh doesn't
// re-trigger the modal.
const WELCOME_SHOWN_KEY = "sheen.welcomeShownAt";

type Variant = "customer" | "washer";

const COPY: Record<Variant, {
  title: string;
  step1Title: string;
  step1Sub: string;
  step1Cta: string;
  step2Title: string;
  step2Sub: string;
  step2Cta: string;
  iosTip: string;
  themeBg: string;
  themeText: string;
  themeAccent: string;
  themeButton: string;
  themeButtonText: string;
  iconUrl: string;
}> = {
  customer: {
    title: "Welcome to Sheen",
    step1Title: "Get Sheen on your phone.",
    step1Sub: "Pin Sheen to your home screen — opens like an app, no App Store, zero phone storage.",
    step1Cta: "Add to home screen",
    step2Title: "Stay in the loop.",
    step2Sub: "Get pinged when your wash is matched, on the way, and done. No spam — only the moments that matter.",
    step2Cta: "Skip for now",
    iosTip: "On iPhone: tap the Share button below, then “Add to Home Screen”.",
    themeBg: "bg-bone",
    themeText: "text-ink",
    themeAccent: "bg-royal",
    themeButton: "bg-royal hover:bg-ink",
    themeButtonText: "text-bone",
    iconUrl: "/icons/customer-512.png",
  },
  washer: {
    title: "Welcome, pro",
    step1Title: "Get Sheen Pro on your phone.",
    step1Sub: "Your queue, one tap from the home screen. Native-app feel, no App Store, no install size.",
    step1Cta: "Add to home screen",
    step2Title: "Hear it the moment it hits.",
    step2Sub: "Push notifications mean you see new jobs the second they post — before they hit anyone else's queue.",
    step2Cta: "Skip for now",
    iosTip: "On iPhone: tap the Share button below, then “Add to Home Screen”.",
    themeBg: "bg-ink",
    themeText: "text-bone",
    themeAccent: "bg-sol",
    themeButton: "bg-sol hover:bg-bone",
    themeButtonText: "text-ink",
    iconUrl: "/icons/washer-512.png",
  },
};

export function WelcomeInstallSheet({ variant }: { variant: Variant }) {
  const router = useRouter();
  const params = useSearchParams();
  const { canPrompt, isStandalone, isIOS, installed, prompt } = useInstallPrompt();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const copy = COPY[variant];

  // Mount logic — fire only when ?welcome=1 is in the URL AND we've never
  // shown this modal before AND the user isn't already in standalone.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (params.get("welcome") !== "1") return;
    if (installed || isStandalone) return;
    try {
      if (window.localStorage.getItem(WELCOME_SHOWN_KEY)) return;
    } catch {
      /* localStorage blocked — show the modal anyway, worst case is a re-show */
    }
    setOpen(true);
    try {
      window.localStorage.setItem(WELCOME_SHOWN_KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    // Strip the welcome flag from the URL without a navigation so refresh
    // and back-forward don't re-trigger.
    const url = new URL(window.location.href);
    url.searchParams.delete("welcome");
    window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
  }, [params, installed, isStandalone]);

  function close() {
    setOpen(false);
    setStep(1);
  }

  async function handleInstall() {
    const outcome = await prompt();
    if (outcome === "accepted") {
      // Move straight to push step — they're committed, capitalise on momentum.
      setStep(2);
    } else if (outcome === "unavailable" && !isIOS) {
      // Browser doesn't support beforeinstallprompt and we're not on iOS —
      // best we can do is surface push and continue.
      setStep(2);
    }
    // Dismissed → leave them on step 1 with the iOS tip / try again.
  }

  // Listen for the appinstalled event hopping the modal to step 2 without
  // requiring the user to tap again (Android Chrome will fire this after
  // they accept the native dialog, sometimes after `prompt()` already
  // returned).
  useEffect(() => {
    if (installed && open && step === 1) setStep(2);
  }, [installed, open, step]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/55 backdrop-blur-sm"
      onClick={(e) => {
        // Click outside dismisses; clicks inside the panel bubble cancelled.
        if (e.target === e.currentTarget) {
          close();
          router.refresh();
        }
      }}
    >
      <div
        className={`relative w-full max-w-md ${copy.themeBg} ${copy.themeText} shadow-2xl animate-in slide-in-from-bottom duration-300`}
        // Stop clicks inside the panel from closing.
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent stripe — bone+royal for customer, ink+sol for washer */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${copy.themeAccent}`} aria-hidden />

        {/* Step indicator */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">
            {copy.title} · {step}/2
          </div>
          <button
            onClick={close}
            aria-label="Close"
            className="opacity-60 hover:opacity-100 transition text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {step === 1 ? (
          <div className="px-6 pb-6">
            <div className="flex items-center gap-4 mt-2 mb-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={copy.iconUrl}
                alt=""
                className="w-16 h-16 rounded-2xl shadow-md"
              />
              <div>
                <h2 id="welcome-title" className="display text-2xl leading-tight">
                  {copy.step1Title}
                </h2>
              </div>
            </div>
            <p className="text-sm leading-relaxed opacity-80">{copy.step1Sub}</p>

            <div className="mt-6">
              {isIOS ? (
                <div className="bg-white/10 px-4 py-3.5 text-sm leading-relaxed">
                  <div className="font-mono text-[10px] uppercase tracking-wider mb-1 opacity-70">
                    iPhone
                  </div>
                  {copy.iosTip}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleInstall}
                  disabled={!canPrompt}
                  className={`w-full py-3.5 text-sm font-bold uppercase tracking-wide transition ${copy.themeButton} ${copy.themeButtonText} disabled:opacity-50`}
                >
                  {canPrompt ? copy.step1Cta : "Install not available on this browser"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setStep(2)}
                className="block w-full mt-3 py-3 text-xs font-mono uppercase tracking-wider opacity-60 hover:opacity-100 transition"
              >
                Maybe later — set up notifications
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 pb-6">
            <h2 id="welcome-title" className="display text-2xl leading-tight mt-2 mb-3">
              {copy.step2Title}
            </h2>
            <p className="text-sm leading-relaxed opacity-80 mb-5">{copy.step2Sub}</p>

            <div className="flex justify-center mb-3">
              {/* The existing button handles permission + Stripe-style state machine. */}
              <EnablePushButton />
            </div>
            <button
              type="button"
              onClick={close}
              className="block w-full mt-2 py-3 text-xs font-mono uppercase tracking-wider opacity-60 hover:opacity-100 transition"
            >
              {copy.step2Cta}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

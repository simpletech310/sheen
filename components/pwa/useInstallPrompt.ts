"use client";

import { useCallback, useEffect, useState } from "react";

// Persist install state across visits. We never auto-renag the same person
// who already said no — but we do reopen the door after a cooldown so an
// initial "maybe later" doesn't lock them out forever.
const STORAGE_KEY = "sheen.installState";
const DISMISS_COOLDOWN_DAYS = 7;

type InstallState =
  | { status: "pending" }
  | { status: "installed"; at: string }
  | { status: "dismissed"; until: string };

// Stripped Chromium prompt-event shape — `next/types` doesn't export this
// because it's not in any DOM lib. Just enough to typecheck `prompt()`.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function readState(): InstallState {
  if (typeof window === "undefined") return { status: "pending" };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { status: "pending" };
    return JSON.parse(raw) as InstallState;
  } catch {
    return { status: "pending" };
  }
}

function writeState(state: InstallState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota exceeded etc. — non-fatal, the worst case is the nudge re-shows */
  }
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS exposes `navigator.standalone`; everywhere else, the display-mode
  // media query is the spec'd answer. Either signals "running as a PWA".
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  if (window.matchMedia?.("(display-mode: window-controls-overlay)").matches) return true;
  if ((window.navigator as any).standalone === true) return true;
  return false;
}

function detectIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  // iPadOS 13+ reports as Mac; sniff for Safari + touch to catch it.
  const isAppleMobile = /iPad|iPhone|iPod/.test(ua);
  const isAppleDesktopWithTouch =
    /Macintosh/.test(ua) && (window.navigator as any).maxTouchPoints > 1;
  return isAppleMobile || isAppleDesktopWithTouch;
}

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [state, setState] = useState<InstallState>(() => readState());
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);

  // One-time hydration — run after mount so we don't break SSR.
  useEffect(() => {
    setIsStandalone(detectStandalone());
    setIsIOS(detectIOS());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    function onBeforeInstall(e: Event) {
      // Stop Chrome from showing its own banner; we'll fire our prompt
      // through the captured event when the user picks "Add to home screen".
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      const next: InstallState = { status: "installed", at: new Date().toISOString() };
      writeState(next);
      setState(next);
      setDeferred(null);
      setIsStandalone(true);
      // Tell other open tabs so their banners self-dismiss without a reload.
      navigator.serviceWorker?.controller?.postMessage({ type: "sheen:installed" });
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall as EventListener);
    window.addEventListener("appinstalled", onInstalled);

    // Sibling tab installed → service worker rebroadcasts; pick it up.
    const onMessage = (event: MessageEvent) => {
      if ((event.data as any)?.type === "sheen:installed") onInstalled();
    };
    navigator.serviceWorker?.addEventListener?.("message", onMessage);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall as EventListener);
      window.removeEventListener("appinstalled", onInstalled);
      navigator.serviceWorker?.removeEventListener?.("message", onMessage);
    };
  }, []);

  const prompt = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferred) return "unavailable";
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice.outcome === "accepted") {
      const next: InstallState = { status: "installed", at: new Date().toISOString() };
      writeState(next);
      setState(next);
    }
    return choice.outcome;
  }, [deferred]);

  const dismiss = useCallback((forDays: number = DISMISS_COOLDOWN_DAYS) => {
    const until = new Date(Date.now() + forDays * 86_400_000).toISOString();
    const next: InstallState = { status: "dismissed", until };
    writeState(next);
    setState(next);
  }, []);

  // The banner-eligibility check the rest of the UI cares about.
  const dismissedActive =
    state.status === "dismissed" && new Date(state.until).getTime() > Date.now();
  const installed = state.status === "installed" || isStandalone;
  const canShowNudge = !installed && !dismissedActive;
  // canPrompt = native install dialog is wired up (Chromium). On iOS we
  // route the user through visual instructions instead.
  const canPrompt = !!deferred && !installed;

  return {
    canPrompt,
    canShowNudge,
    isStandalone,
    isIOS,
    installed,
    prompt,
    dismiss,
  };
}

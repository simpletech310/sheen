"use client";

import { useEffect, useState } from "react";

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/**
 * Mounts on the client to register the service worker + offer push notifications.
 * Render once, near the top of an app layout that requires a logged-in user.
 */
export function PWARegister({ enablePush }: { enablePush?: boolean }) {
  const [, setReg] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((r) => setReg(r))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!enablePush || !VAPID_KEY) return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    (async () => {
      try {
        // Don't auto-prompt — only register an existing subscription.
        // Real prompt comes from a user-initiated button elsewhere.
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (!existing) return;
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: existing.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(existing.getKey("p256dh")!),
              auth: arrayBufferToBase64(existing.getKey("auth")!),
            },
            user_agent: navigator.userAgent,
          }),
        });
      } catch {
        /* silent */
      }
    })();
  }, [enablePush]);

  return null;
}

function arrayBufferToBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

/** Button to ask for permission + subscribe. Mount on a settings or onboarding page. */
export function EnablePushButton() {
  const [state, setState] = useState<"idle" | "subscribed" | "denied" | "loading">("idle");

  async function enable() {
    if (!VAPID_KEY) return;
    setState("loading");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(sub.getKey("p256dh")!),
            auth: arrayBufferToBase64(sub.getKey("auth")!),
          },
          user_agent: navigator.userAgent,
        }),
      });
      setState("subscribed");
    } catch {
      setState("denied");
    }
  }

  return (
    <button
      onClick={enable}
      disabled={state === "loading" || state === "subscribed"}
      className="inline-block bg-royal text-bone px-4 py-2 text-xs font-bold uppercase tracking-wide disabled:opacity-50"
    >
      {state === "subscribed"
        ? "✓ Notifications on"
        : state === "denied"
        ? "Notifications blocked"
        : state === "loading"
        ? "…"
        : "Enable notifications"}
    </button>
  );
}

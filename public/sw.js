// SHEEN service worker — minimal offline shell + Web Push handlers.
//
// v3 — dual-PWA support. Two manifests (customer + washer) plus the
// new icon set are precached so a freshly-installed PWA can render
// its icon and splash without a network roundtrip. Cache name bump
// invalidates v2 caches that were keyed against the old icons.
const CACHE = "sheen-v3";
const APP_SHELL = [
  "/",
  "/app",
  "/pro/queue",
  "/manifest.webmanifest",
  "/manifest-customer.webmanifest",
  "/manifest-washer.webmanifest",
  "/icons/customer-192.png",
  "/icons/customer-512.png",
  "/icons/customer-apple-touch.png",
  "/icons/washer-192.png",
  "/icons/washer-512.png",
  "/icons/washer-apple-touch.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Bare-minimum fallback so respondWith always resolves with a real
// Response — never undefined, which is what was causing the SW to
// reject the FetchEvent.
function offlineFallback() {
  return new Response(
    "<!doctype html><meta charset=utf-8><title>Offline</title><style>body{font:16px system-ui;background:#0a0a0a;color:#fafaf7;padding:48px 24px;text-align:center}h1{font-size:24px}a{color:#FFA300}</style><h1>Offline</h1><p>Reconnect and try again.</p><a href=\"/\">Reload</a>",
    { status: 503, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || !req.url.startsWith(self.location.origin)) return;

  // Don't intercept Next.js internals, API routes, or auth — let the
  // browser hit the network directly. Caching session-aware server
  // routes leads to stale-auth surprises (the user seeing someone
  // else's /pro page after a sign-in switch).
  const url = new URL(req.url);
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/")
  ) {
    return;
  }

  // Network-first for HTML, cache-first for everything else.
  // Every branch resolves with a real Response so respondWith never
  // gets undefined.
  if (req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const cloned = res.clone();
            caches.open(CACHE).then((c) => c.put(req, cloned)).catch(() => {});
          }
          return res;
        })
        .catch(async () => {
          const m = await caches.match(req);
          if (m) return m;
          const root = await caches.match("/");
          if (root) return root;
          return offlineFallback();
        })
    );
  } else {
    event.respondWith(
      caches.match(req).then(async (m) => {
        if (m) return m;
        try {
          const res = await fetch(req);
          if (res && res.ok) {
            const cloned = res.clone();
            caches.open(CACHE).then((c) => c.put(req, cloned)).catch(() => {});
          }
          return res;
        } catch {
          return offlineFallback();
        }
      })
    );
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { payload = { title: "Sheen", body: event.data.text() }; }
  // Pick the icon that matches the surface the notification points at:
  // /pro/* destinations get the washer icon, everything else the customer.
  const url = payload.data?.url || "/";
  const isPro = typeof url === "string" && url.startsWith("/pro");
  const icon = isPro ? "/icons/washer-192.png" : "/icons/customer-192.png";
  event.waitUntil(
    self.registration.showNotification(payload.title || "Sheen", {
      body: payload.body || "",
      icon,
      badge: icon,
      data: payload.data || {},
      tag: payload.tag,
    })
  );
});

// Broadcast `appinstalled` to all open tabs so the install banner can
// self-dismiss without needing a page reload. The window-side listener
// checks `event.data?.type === 'sheen:installed'`.
self.addEventListener("message", (event) => {
  if (event.data?.type !== "sheen:installed") return;
  self.clients.matchAll({ type: "window" }).then((clients) => {
    for (const c of clients) c.postMessage({ type: "sheen:installed" });
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const c of clients) {
        if ("focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

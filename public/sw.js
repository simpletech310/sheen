// SHEEN service worker — minimal offline shell + Web Push handlers.
const CACHE = "sheen-v1";
const APP_SHELL = ["/", "/app", "/pro/queue", "/manifest.webmanifest"];

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

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || !req.url.startsWith(self.location.origin)) return;
  // Network-first for HTML, cache-first for everything else
  if (req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const cloned = res.clone();
          caches.open(CACHE).then((c) => c.put(req, cloned));
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match("/")))
    );
  } else {
    event.respondWith(
      caches.match(req).then((m) =>
        m || fetch(req).then((res) => {
          const cloned = res.clone();
          caches.open(CACHE).then((c) => c.put(req, cloned));
          return res;
        })
      )
    );
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { payload = { title: "Sheen", body: event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(payload.title || "Sheen", {
      body: payload.body || "",
      icon: "/icons/icon-192.svg",
      badge: "/icons/icon-192.svg",
      data: payload.data || {},
      tag: payload.tag,
    })
  );
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

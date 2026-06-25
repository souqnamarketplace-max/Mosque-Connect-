// Masjid Connect service worker.
// Handles: (1) Web Push receipt + notification click routing, for browser/PWA
// use. (2) A minimal offline cache for the app shell, supporting the
// "Offline Prayer Schedules" feature direction. This file intentionally
// stays simple (hand-written, no Workbox) since the caching needs here are
// small and predictable — see Functional Spec discussion of next-pwa vs.
// a hand-rolled SW for a project this size.
//
// NOTE: this SW is for the browser/PWA context. When wrapped with Capacitor,
// push notifications should switch to Capacitor's native Push Notifications
// plugin (APNs/FCM) instead — see src/lib/push/platform.ts for the gate that
// decides which transport to use at runtime.

const CACHE_NAME = "masjid-connect-shell-v1";
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [OFFLINE_URL];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Network-first for navigations, falling back to the offline page only when
// truly offline — we don't want stale cached HTML masking real content
// updates (prayer times, announcements) the way an aggressive cache would.
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL).then((res) => res || Response.error()))
    );
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Masjid Connect", body: event.data.text() };
  }

  const title = payload.title || "Masjid Connect";
  const options = {
    body: payload.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

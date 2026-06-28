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

const CACHE_NAME = "masjid-connect-shell-v2";
const OFFLINE_URL = "/offline";

// Pages worth caching for offline navigation, beyond the dedicated offline
// fallback page — these are the ones a person would reasonably try to open
// while offline specifically to check prayer times (Offline Prayer
// Schedules feature). Caching the shell here doesn't replace the IndexedDB
// data cache (src/lib/offline/prayerCache.ts) — it solves a different half
// of the problem: being able to load the page itself when there's no
// network, so that data cache has somewhere to render into.
const PRECACHE_URLS = [OFFLINE_URL, "/", "/prayer"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {
        // Precaching "/" and "/prayer" can fail at install time if they
        // require auth/cookies not yet present for this client; that's
        // fine — the runtime fetch handler below still caches them on
        // first successful visit, this just means it isn't pre-warmed.
      }))
      .then(() => self.skipWaiting())
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

// Network-first for navigations: try the network so content is always
// fresh when online, but on failure fall back to a cached copy of that
// same page if we have one, and only fall back to the generic offline
// page as a last resort.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache a copy of successfully-loaded navigable pages for offline reuse.
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(event.request)
            .then((cached) => cached || caches.match(OFFLINE_URL))
            .then((res) => res || Response.error())
        )
    );
    return;
  }

  // Network-first for the prayer-times API itself, caching successful
  // responses so a future offline request to this exact URL (same mosque,
  // same day) can still be served from the Cache API as a second line of
  // defense alongside the IndexedDB cache in prayerCache.ts.
  if (url.pathname === "/api/prayer-times/today") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
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

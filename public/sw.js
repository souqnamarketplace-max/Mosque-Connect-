// ── Masjid Connect Service Worker ─────────────────────────────────────────────
// Handles: Web Push notifications + offline cache shell

const CACHE_NAME = 'mc-shell-v1';
const OFFLINE_URLS = ['/', '/offline'];

// ── Install: cache offline shell ──────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: serve from cache if offline ───────────────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match('/offline').then(r => r || new Response('Offline'))
    )
  );
});

// ── Push: show notification ───────────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Masjid Connect', body: event.data.text() };
  }

  const { title = 'Masjid Connect', body = '', icon, badge, tag, url, category } = payload;

  const options = {
    body,
    icon: icon || '/icons/icon-192x192.png',
    badge: badge || '/icons/badge-72x72.png',
    tag: tag || category || 'mc-general',
    data: { url: url || '/' },
    requireInteraction: category === 'emergency',
    vibrate: category === 'emergency' ? [200, 100, 200] : [100],
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      // Otherwise open new window
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

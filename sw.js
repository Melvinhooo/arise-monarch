// ARISE MONARCH — Service Worker
// Cache-first für App-Shell, Network-first für /data/*.json, Push-Handler für GitHub-Actions-Notifications

const VERSION = 'arise-v5';
const SHELL_CACHE = `arise-shell-${VERSION}`;
const DATA_CACHE = `arise-data-${VERSION}`;

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './notifications.js',
  './icons/lightning.svg',
  './icons/lightning-maskable.svg',
  './icons/crown.svg',
  './icons/apple-touch-icon-v2.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_FILES.filter(Boolean)).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Network-first für JSON-Daten — User kann data/*.json editieren, App pullt frisch wenn online
  if (url.pathname.includes('/data/') && url.pathname.endsWith('.json')) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(DATA_CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Cache-first für alles andere
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res.ok && (url.origin === self.location.origin || url.hostname.includes('jsdelivr'))) {
        const copy = res.clone();
        caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => cached))
  );
});

// Push-Empfang von GitHub-Actions-Cron via VAPID
self.addEventListener('push', (event) => {
  let data = { title: '⚡ ARISE', body: 'Hunter, Zeit für die nächste Quest.', tag: 'arise-default' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icons/apple-touch-icon.png',
      badge: './icons/apple-touch-icon.png',
      tag: data.tag,
      data: { url: data.url || './' },
      vibrate: [80, 40, 80]
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((all) => {
      for (const c of all) { if (c.url.includes(url) && 'focus' in c) return c.focus(); }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Bridge: Page kann SW direkt um eine Notification bitten (Edge-Case wenn Page schließt)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'show-notification') {
    const { title, body, tag } = event.data.payload;
    self.registration.showNotification(title, {
      body, tag, icon: './icons/apple-touch-icon.png', badge: './icons/apple-touch-icon.png', vibrate: [80, 40, 80]
    });
  }
});

// Offline support: try the network first (so updates arrive), fall back to the cached copy.
const CACHE = 'gymlog-v8';
// The app itself must cache; the machine photos are optional (the app shows line icons without them).
const CORE = [
  './', './index.html', './styles.css', './app.js', './icons.js', './manifest.json',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
];
const OPTIONAL = [
  './images/treadmill.jpg', './images/stationary-bike.png', './images/spin-bike.jpg', './images/air-bike.jpg',
  './images/rowing.jpg', './images/elliptical.png', './images/stair-climber.jpg', './images/running.png',
  './images/walking.png', './images/cycling.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // 'reload' skips the browser's HTTP cache so a new version never stores stale copies
      .then((c) => Promise.all([
        ...CORE.map((u) => c.add(new Request(u, { cache: 'reload' }))),
        ...OPTIONAL.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {})),
      ]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      // only touch our own caches: other apps on the same address keep theirs
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('gymlog-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      // Gyms often have bad signal: don't wait more than 3s before using the cached app.
      const res = await Promise.race([fetch(req, { cache: 'no-cache' }), timeout(3000)]);
      if (res && res.ok) event.waitUntil(cache.put(req, res.clone()));
      return res;
    } catch {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') return cache.match('./index.html');
      return Response.error();
    }
  })());
});

// Network first: online, every launch gets the latest deploy, so no version bump is needed
// when games change. Each response is kept as the offline copy; a slow network falls back
// to that copy after a few seconds.
const CACHE = 'papapps';
const SLOW_MS = 4000;
// After one timeout, the files that follow use their copy at once: modules load one after
// another, so waiting for each would add up (16 s for a game with a stalled server).
const SLOW_FOR_MS = 15000;
let slowUntil = 0;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const network = fetch(request);
  // Cloned as soon as the response arrives, before the page can read the body.
  const stored = network.then((response) => {
    if (!response.ok) return;
    const copy = response.clone();
    return caches.open(CACHE).then((cache) => cache.put(request, copy));
  });
  event.waitUntil(stored.catch(() => {}));
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (!cached) return network;
      if (Date.now() < slowUntil) return cached;
      const slow = new Promise((resolve) =>
        setTimeout(() => {
          slowUntil = Date.now() + SLOW_FOR_MS;
          resolve(cached);
        }, SLOW_MS),
      );
      return Promise.race([network.catch(() => cached), slow]);
    })(),
  );
});

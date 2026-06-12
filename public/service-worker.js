/* global caches, fetch, self, URL */

const SHELL_CACHE = 'acp-shell-v1';
const RUNTIME_CACHE = 'acp-runtime-v1';
const scopedUrl = (path) => new URL(path, self.registration.scope).toString();
const SHELL_INDEX = scopedUrl('index.html');
const SHELL_ASSETS = [
  scopedUrl(''),
  SHELL_INDEX,
  scopedUrl('manifest.webmanifest'),
  scopedUrl('assets/icons/nook1.svg'),
  scopedUrl('assets/icons/nook1-192.png'),
  scopedUrl('assets/icons/nook1-512.png'),
];
const CACHEABLE_DESTINATIONS = new Set(['font', 'image', 'manifest', 'script', 'style']);

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(SHELL_INDEX)));
    return;
  }

  if (url.pathname.endsWith('.mp3')) {
    return;
  }

  if (CACHEABLE_DESTINATIONS.has(request.destination)) {
    event.respondWith(networkFirst(request));
  }
});

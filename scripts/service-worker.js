/* Replaced by build-pwa.mjs after Vite has emitted the complete production build. */
/* global __CACHE_NAME__, __CACHE_PREFIX__, __PRECACHE__ */
const CACHE = __CACHE_NAME__;
const PREFIX = __CACHE_PREFIX__;
const FILES = __PRECACHE__;
const APP = new URL(self.registration.scope);
const INDEX = new URL("index.html", APP).href;
const ASSETS = new Set(FILES.map((path) => new URL(path, APP).href));

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      // All assets must succeed. Never activate a partially downloaded release.
      await cache.addAll(FILES.map((url) => new Request(url, { cache: "reload" })));
    } catch (error) {
      await caches.delete(CACHE);
      throw error;
    }
    // No skipWaiting: an answer in any existing tab must retain its version.
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith(PREFIX) && name !== CACHE) await caches.delete(name);
    }
    // First installation also controls its original page once precaching finishes.
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== APP.origin || !url.pathname.startsWith(APP.pathname)) return;
  // Hash routes share one shell. Unknown paths and other apps remain network-only.
  const shell = request.mode === "navigate" &&
    (url.pathname === APP.pathname || url.pathname === `${APP.pathname}index.html`);
  const key = shell ? INDEX : url.href;
  if (!shell && !ASSETS.has(key)) return;
  event.respondWith((async () => {
    const cached = await (await caches.open(CACHE)).match(key);
    return cached ?? fetch(request);
  })());
});

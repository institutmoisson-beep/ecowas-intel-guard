/* ISIS — service worker: cache optimisé + mise à jour automatique */
const VERSION = "isis-v1";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;

const PRECACHE = ["/manifest.webmanifest", "/favicon.png", "/icon-192.png", "/app-icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_build/") ||
    url.pathname.startsWith("/assets/") ||
    /\.(?:js|css|woff2?|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Jamais de cache pour les données sensibles / API.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_serverFn/")) return;

  if (isStaticAsset(url)) {
    // Cache-first: les bundles sont versionnés par hash.
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (request.mode === "navigate") {
    // Network-first: l'utilisateur voit toujours la dernière version en ligne.
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(PAGE_CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match("/"))),
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

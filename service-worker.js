const CACHE_NAME = "kontak-teman-v1";

const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./tambah.html",
  "./daftar.html",
  "./edit.html",
  "./kop.html",
  "./manifest.json",
  "./assets/css/style.css",
  "./assets/js/api.js",
  "./assets/js/app.js",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

// Cache-first for static assets
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((resp) => {
        // Optionally cache new static files
        return resp;
      }).catch(() => cached);
    })
  );
});
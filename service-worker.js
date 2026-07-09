const CACHE_NAME = "yildizli-ortalama-v025-auto-cloud-pull";
const ASSETS = [
  "./",
  "./index.html",
  "./ders-takip.html",
  "./css/style.css",
  "./js/app.js",
  "./js/firebase-sync.js",
  "./manifest-yildizli.json",
  "./assets/ders-takip-pastel-ikon.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-180.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => {
      if (key !== CACHE_NAME) return caches.delete(key);
    }))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html")))
  );
});

const CACHE_NAME = "lista-familiar-v2";
const APP_SHELL = ["./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest", "./icon-512.png"];
self.addEventListener("install", (event) => { event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))); self.skipWaiting(); });
self.addEventListener("activate", (event) => { event.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", (event) => { if (event.request.method === "GET") event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request))); });

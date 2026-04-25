const CACHE="wbs-node-sqlite-pwa-v1";
const ASSETS=["/","/index.html","/manifest.json","/icons/icon.svg"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener("fetch",e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));

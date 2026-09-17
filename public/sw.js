// Service Worker mínimo para satisfazer o critério de instalabilidade PWA do Chrome
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

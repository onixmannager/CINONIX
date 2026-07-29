// sw.js — Service Worker de Cinonix
// Cachea imágenes para uso offline / carga rápida.

const CACHE = 'cinonix-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  const isImage = /\.(webp|jpg|jpeg|png|gif|svg)$/i.test(url.pathname);

  if (isImage) {
    e.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(e.request).then((cached) => {
          if (cached) return cached;
          return fetch(e.request)
            .then((resp) => {
              if (resp && resp.status === 200) cache.put(e.request, resp.clone());
              return resp;
            })
            .catch(() => cached);
        })
      )
    );
  }
});

// Service Worker mínimo para PWA
// Al cambiar este archivo (por ejemplo, subir la versión del caché) los
// celulares que ya tienen la app instalada descartan el caché anterior.
const CACHE = 'bv-reportes-v2';
const ASSETS = ['/', '/manifest.json', '/icon.svg', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
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
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/api/')) return; // No cachear APIs
  if (e.request.url.includes('firestore')) return; // No cachear Firestore

  // La página (index.html) se pide siempre primero a la red, para que cada
  // despliegue nuevo llegue de inmediato; el caché queda solo como respaldo
  // cuando no hay señal.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put('/', copia));
          }
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request).catch(() => caches.match('/')))
  );
});

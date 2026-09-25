// Service worker de Nutrición.
// Objetivo: que la app abra y funcione (registro, historial, comidas guardadas,
// búsqueda en SARA2/BAM, gráficos) aunque el teléfono esté en modo avión.
// Lo que SIGUE necesitando internet siempre: buscar en USDA, Open Food Facts,
// y la estimación por foto/texto con Claude — son APIs externas, no se cachean.

const CACHE_NAME = 'nutricion-cache-v1'; // subir el número cuando cambie qué se cachea

const ARCHIVOS_APP = [
  './',
  './alimentos-argentina.json',
  './alimentos-mexico.json',
  './manifest.json'
];

self.addEventListener('install', (evento) => {
  self.skipWaiting();
  evento.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS_APP))
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(nombres.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evento) => {
  const url = new URL(evento.request.url);

  // Solo intervenimos pedidos al propio origen (la app y los JSON de alimentos).
  // USDA, Open Food Facts y Claude van siempre directo a la red, sin caché.
  if (url.origin !== self.location.origin) return;
  if (evento.request.method !== 'GET') return;

  evento.respondWith(
    caches.match(evento.request).then((cacheado) => {
      const actualizarDesdeRed = fetch(evento.request).then((resp) => {
        if (resp && resp.ok) {
          const copia = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(evento.request, copia));
        }
        return resp;
      }).catch(() => null);

      // Si hay copia en caché, servirla al toque (instantáneo, sirve sin internet);
      // la red se consulta igual en paralelo para refrescar el caché de cara a la próxima.
      // Sin caché (primera visita), esperar la red.
      return cacheado || actualizarDesdeRed;
    })
  );
});

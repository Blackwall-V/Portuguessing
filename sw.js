/* Service worker: la app funciona sin conexión.
 * Estrategia "stale-while-revalidate": responde con la copia guardada y
 * actualiza en segundo plano; los cambios se ven en la siguiente apertura.
 * Sube CACHE si cambias la lista de archivos. */
const CACHE = 'portuguessing-v4';
const ASSETS = [
  './', 'index.html', 'css/styles.css', 'js/icons.js', 'js/config.js', 'js/lib.js', 'js/data.js', 'js/tts.js', 'js/app.js',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'icons/maskable-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => k !== CACHE && !k.startsWith('portuguessing-voice')) // la voz descargada (js/tts.js) se conserva
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  // Frases aprobadas: primero la red (se ven en vivo) y, sin conexión, la última copia guardada.
  if (url.pathname.includes('/content/')) {
    e.respondWith(
      fetch(req)
        .then((res) => { if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone())); return res; })
        .catch(() => caches.match(req, { ignoreSearch: true }))
    );
    return;
  }
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req)
        .then((res) => { if (res.ok) cache.put(req, res.clone()); return res; })
        .catch(() => cached);
      return cached || network;
    })
  );
});

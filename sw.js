// Service worker: permite abrir la app sin internet y la vuelve "instalable".
// Estrategia: primero intenta la red (para recibir siempre la versión nueva);
// si no hay internet, usa la copia guardada. Ya no hay que cambiar números a mano.

const CACHE = 'pyl-app';
const BASICOS = [
  './', './index.html', './css/app.css', './manifest.webmanifest',
  './js/app.js', './js/calc.js', './js/store.js', './js/config.js', './js/defaults.js', './js/iconos.js', './js/importer.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/favicon.png',
  './img/tdp.png', './img/tdp-claro.png', './img/zerenta.png', './img/zerenta-claro.png',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASICOS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Firebase (datos y login) maneja su propia conexión: no tocar
  if (/googleapis\.com$|firebaseio\.com$|firebaseapp\.com$/.test(url.hostname) && !url.hostname.startsWith('fonts.')) return;

  ev.respondWith(
    fetch(req)
      .then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});

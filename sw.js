/**
 * Service Worker leve para funcionar como Aplicativo (PWA) no celular
 * e abrir mesmo quando a internet da escola estiver fraca ou fora do ar.
 */

const CACHE_NOME = 'caixa-escolar-facil-v4';
const ARQUIVOS_BASE = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/charts.js',
  './js/icons.js',
  './js/money.js',
  './js/security.js',
  './js/storage.js',
  './js/attachments.js',
  './js/cloud.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NOME).then((cache) => cache.addAll(ARQUIVOS_BASE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(
        chaves
          .filter((chave) => chave !== CACHE_NOME)
          .map((chave) => caches.delete(chave))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((respostaCache) => {
      return (
        respostaCache ||
        fetch(event.request).catch(() => caches.match('./index.html'))
      );
    })
  );
});

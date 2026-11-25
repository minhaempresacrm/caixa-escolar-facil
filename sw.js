/**
 * Service Worker leve para funcionar como Aplicativo (PWA) no celular
 * - v5: inclui rpmaster_bridge.js, ignora chamadas de API Supabase (sempre rede)
 *   e usa network-first para HTML/JS para entregar atualizações imediatamente.
 */

const CACHE_NOME = 'caixa-escolar-facil-v6';
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
  './js/rpmaster_bridge.js',
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
  const url = event.request.url || '';
  if (url.includes('supabase.co')) return;

  event.respondWith(
    fetch(event.request)
      .then((resposta) => {
        if (resposta && resposta.ok && resposta.type === 'basic' && !url.includes('rpm_cef_token')) {
          const clone = resposta.clone();
          caches.open(CACHE_NOME).then((cache) => cache.put(event.request, clone)).catch(() => {});
        }
        return resposta;
      })
      .catch(() => caches.match(event.request).then((c) => c || caches.match('./index.html')))
  );
});

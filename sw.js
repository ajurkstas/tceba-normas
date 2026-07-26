const CACHE = 'tce-normas-v1';
const ARQUIVOS = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ARQUIVOS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c)))
    )
  );
  self.clients.claim();
});

// Cache-first para o shell do app; a consulta à IA sempre passa pela rede.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.hostname === 'api.anthropic.com') return; // nunca cachear a consulta
  event.respondWith(
    caches.match(event.request).then((resp) => resp || fetch(event.request))
  );
});

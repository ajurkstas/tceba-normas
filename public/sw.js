// Service worker de transição: remove os caches da versão antiga (PWA em
// arquivo único) e se desregistra, para que a versão React seja carregada
// sempre da rede. O app Android não usa service worker.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.map((c) => caches.delete(c))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clientes) => clientes.forEach((c) => c.navigate(c.url)))
  );
});

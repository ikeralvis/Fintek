// --- Caché estática + soporte offline básico ---
// Estrategia deliberadamente simple: solo cachea assets estáticos (hasheados/inmutables) y
// la página raíz como fallback de navegación. Nunca cachea /api/, /auth/ ni datos financieros:
// esta app siempre necesita datos frescos de Supabase, un dato viejo servido offline sería peor
// que un error de red.
const CACHE_NAME = 'fintek-static-v1';
const PRECACHE_URLS = ['/', '/manifest.json', '/logo.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;

  const isStaticAsset = url.pathname.startsWith('/_next/static/') || /\.(png|jpg|jpeg|svg|ico|woff2?)$/.test(url.pathname);

  if (isStaticAsset) {
    // Cache-first: son inmutables (nombre con hash o icono fijo), no hace falta revalidar.
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      }))
    );
    return;
  }

  if (request.mode === 'navigate') {
    // Network-first: si no hay red, cae a la copia cacheada de esa página o, si no existe, al shell raíz.
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Fintek', body: event.data.text() };
  }

  const title = payload.title || 'Fintek';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/logo.png',
    badge: '/logo.png',
    tag: payload.tag || 'fintek-notification',
    data: { url: payload.url || '/dashboard' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

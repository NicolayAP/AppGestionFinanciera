/**
 * FinTrack – Service Worker
 * sw.js
 *
 * Estrategias de caché implementadas:
 *  1. Cache First  → App Shell (HTML, CSS, JS, iconos)
 *  2. Network First → peticiones de red (APIs externas, CDN)
 *  3. Stale While Revalidate → fuentes tipográficas de Google
 */

const CACHE_NAME      = 'fintrack-v1.2';
const RUNTIME_CACHE   = 'fintrack-runtime-v1';
const FONTS_CACHE     = 'fintrack-fonts-v1';

/* ── App Shell: recursos que deben estar en caché SIEMPRE ── */
const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/db.js',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

/* ── CDN externo que cacheamos en tiempo de ejecución ── */
const RUNTIME_ASSETS = [
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
];

/* ════════════════════════════════════════════
   INSTALL  – Pre-cacheado del App Shell
════════════════════════════════════════════ */
self.addEventListener('install', event => {
  console.log('[SW] install – cacheando App Shell…');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Abriendo caché:', CACHE_NAME);
        return cache.addAll(APP_SHELL_ASSETS);
      })
      .then(() => {
        // Pre-cachear assets de runtime (CDN)
        return caches.open(RUNTIME_CACHE).then(cache =>
          cache.addAll(RUNTIME_ASSETS).catch(err =>
            console.warn('[SW] No se pudo cachear CDN en install:', err)
          )
        );
      })
      .then(() => {
        console.log('[SW] App Shell cacheado correctamente.');
        return self.skipWaiting(); // Activar inmediatamente sin esperar
      })
      .catch(err => {
        console.error('[SW] Error durante install:', err);
      })
  );
});

/* ════════════════════════════════════════════
   ACTIVATE  – Limpieza de cachés obsoletos
════════════════════════════════════════════ */
self.addEventListener('activate', event => {
  console.log('[SW] activate – limpiando cachés antiguas…');

  const validCaches = [CACHE_NAME, RUNTIME_CACHE, FONTS_CACHE];

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => !validCaches.includes(name))
            .map(name => {
              console.log('[SW] Eliminando caché obsoleta:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activado. Tomando control de todos los clientes.');
        return self.clients.claim(); // Controlar páginas ya abiertas
      })
      .catch(err => {
        console.error('[SW] Error durante activate:', err);
      })
  );
});

/* ════════════════════════════════════════════
   FETCH  – Intercepción de peticiones
════════════════════════════════════════════ */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar peticiones que no son GET
  if (request.method !== 'GET') return;

  // ── 1. Fuentes de Google → Stale While Revalidate ──
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request, FONTS_CACHE));
    return;
  }

  // ── 2. CDN externo → Network First con fallback a caché ──
  if (url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(networkFirstWithFallback(request, RUNTIME_CACHE));
    return;
  }

  // ── 3. App Shell (mismo origen) → Cache First ──
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirstWithNetworkFallback(request));
    return;
  }

  // ── 4. Cualquier otra petición → Network First ──
  event.respondWith(networkFirstWithFallback(request, RUNTIME_CACHE));
});

/* ════════════════════════════════════════════
   ESTRATEGIAS DE CACHÉ
════════════════════════════════════════════ */

/**
 * Cache First con fallback a red y guardado en caché
 * Ideal para: App Shell (HTML, CSS, JS locales)
 */
async function cacheFirstWithNetworkFallback(request) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      console.log('[SW] Cache First: sirviendo desde caché →', request.url);
      return cached;
    }

    console.log('[SW] Cache First: recurso no encontrado, recuperando de red →', request.url);
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    console.error('[SW] Cache First falló:', err);
    // Fallback offline para navegación
    if (request.destination === 'document') {
      const fallback = await caches.match('./index.html');
      if (fallback) return fallback;
    }
    return offlineFallbackResponse();
  }
}

/**
 * Network First con fallback a caché
 * Ideal para: CDN externos, recursos que deben estar actualizados
 */
async function networkFirstWithFallback(request, cacheName) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      console.log('[SW] Network First: guardado en caché →', request.url);
    }
    return networkResponse;
  } catch (err) {
    console.warn('[SW] Network First: sin red, buscando en caché →', request.url);
    const cached = await caches.match(request);
    if (cached) return cached;
    return offlineFallbackResponse();
  }
}

/**
 * Stale While Revalidate
 * Ideal para: fuentes, recursos que cambian poco pero queremos frescos
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then(networkResponse => {
      if (networkResponse && networkResponse.ok) {
        cache.put(request, networkResponse.clone());
        console.log('[SW] SWR: actualizado en caché →', request.url);
      }
      return networkResponse;
    })
    .catch(err => {
      console.warn('[SW] SWR: no se pudo actualizar desde red:', err);
    });

  // Retornar caché inmediatamente (si existe) y actualizar en segundo plano
  return cached || fetchPromise;
}

/**
 * Respuesta de error genérica cuando no hay caché ni red
 */
function offlineFallbackResponse() {
  return new Response(
    JSON.stringify({ error: 'Sin conexión y recurso no disponible en caché.' }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/* ════════════════════════════════════════════
   MENSAJES DESDE LA APP
════════════════════════════════════════════ */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Mensaje recibido: SKIP_WAITING');
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.payload;
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then(cache => cache.addAll(urls))
    );
  }
});

/* ════════════════════════════════════════════
   BACKGROUND SYNC (preparado para futuro)
════════════════════════════════════════════ */
self.addEventListener('sync', event => {
  if (event.tag === 'sync-gastos') {
    console.log('[SW] Background Sync: sincronizando gastos pendientes…');
    event.waitUntil(syncPendingData());
  }
});

async function syncPendingData() {
  // Placeholder para sincronización futura con backend
  console.log('[SW] syncPendingData: no hay backend configurado aún.');
}

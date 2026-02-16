/**
 * Service Worker para G10 Flow PWA
 * 
 * Características:
 * - Cache de assets estáticos
 * - Estrategia stale-while-revalidate para la app
 * - Offline fallback
 * - Background sync para acciones pendientes
 * - Push notifications (preparado)
 */

const CACHE_NAME = "g10flow-v1";
const STATIC_CACHE = "g10flow-static-v1";
const DYNAMIC_CACHE = "g10flow-dynamic-v1";

// Assets a cachear inmediatamente
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/offline",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// Instalación del Service Worker
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("[SW] Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log("[SW] Installation complete");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("[SW] Installation failed:", error);
      })
  );
});

// Activación del Service Worker
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
  
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return (
                name.startsWith("g10flow-") &&
                name !== STATIC_CACHE &&
                name !== DYNAMIC_CACHE
              );
            })
            .map((name) => {
              console.log("[SW] Deleting old cache:", name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log("[SW] Activation complete");
        return self.clients.claim();
      })
  );
});

// Interceptar fetch requests
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorar requests de analytics y APIs de terceros
  if (
    url.hostname.includes("google-analytics") ||
    url.hostname.includes("supabase") ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }
  
  // Estrategia: Network First para navegación (páginas HTML)
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // Estrategia: Cache First para assets estáticos
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image" ||
    request.destination === "font"
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }
  
  // Estrategia: Stale While Revalidate para todo lo demás
  event.respondWith(staleWhileRevalidate(request));
});

/**
 * Estrategia: Network First
 * Intenta la red primero, si falla usa cache
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Guardar en cache para uso offline
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log("[SW] Network failed, trying cache...");
    
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Si no hay cache y es navegación, mostrar página offline
    if (request.mode === "navigate") {
      return caches.match("/offline");
    }
    
    throw error;
  }
}

/**
 * Estrategia: Cache First
 * Usa cache primero, si no existe va a la red
 */
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error("[SW] Cache and network both failed:", error);
    throw error;
  }
}

/**
 * Estrategia: Stale While Revalidate
 * Sirve del cache inmediatamente, pero actualiza en background
 */
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  // Actualizar en background
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch((error) => {
      console.log("[SW] Background fetch failed:", error);
    });
  
  // Retornar cache inmediatamente si existe
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Si no hay cache, esperar la red
  return fetchPromise;
}

// Background Sync para acciones pendientes
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-exercise-completions") {
    event.waitUntil(syncExerciseCompletions());
  }
});

async function syncExerciseCompletions() {
  // Implementar sincronización de ejercicios completados
  console.log("[SW] Syncing exercise completions...");
}

// Push Notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    tag: data.tag || "default",
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
    data: data.data || {},
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Click en notificación
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  const notificationData = event.notification.data;
  let url = "/dashboard";
  
  if (notificationData?.url) {
    url = notificationData.url;
  }
  
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      // Si hay una ventana abierta, enfocarla
      for (const client of clientList) {
        if (client.url === url && "focus" in client) {
          return client.focus();
        }
      }
      
      // Si no, abrir nueva ventana
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// Mensajes desde la app
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});

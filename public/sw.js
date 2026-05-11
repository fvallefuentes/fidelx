/**
 * Service Worker minimal pour la PWA Fidlify.
 *
 * À ce stade : pas de cache offline aggressive (le dashboard nécessite
 * la connexion DB et le scan d'un QR doit toujours appeler le backend).
 * Sert uniquement à rendre l'app installable et à intercepter les requêtes
 * pour pouvoir un jour ajouter du cache offline (scan queue, etc.).
 *
 * Pour une queue offline scan : voir comment.
 */

const CACHE_NAME = "fidlify-v1";

self.addEventListener("install", (event) => {
  // Activation immédiate à la 1ère install
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Prend le contrôle de toutes les pages ouvertes immédiatement
  event.waitUntil(self.clients.claim());

  // Nettoie les anciens caches si l'on bump CACHE_NAME plus tard
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Ne pas intercepter les requêtes non-GET, les API, ou les origines tierces
  if (event.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/_next/")) return;

  // Stratégie network-first avec fallback cache (offline-friendly basique)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Mise en cache opportuniste (réponses 200 OK)
        if (response.ok && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || Response.error()))
  );
});

"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker côté client.
 * À monter dans le layout dashboard pour activer la PWA pour les commerçants.
 *
 * Le SW n'est enregistré que :
 * - en production (NODE_ENV === "production")
 * - sur HTTPS (sinon l'API ne fonctionne pas)
 * - si l'API ServiceWorker est dispo (presque tous les navigateurs modernes)
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    if (window.location.protocol !== "https:") return;

    // Enregistrement défensif : si ça échoue, pas grave, le site fonctionne
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => {
        console.warn("[PWA] Service worker registration failed:", err);
      });
  }, []);

  return null;
}

/**
 * Posthog côté client (browser).
 *
 * Initialisé une seule fois au mount du layout root. Capture
 * automatiquement les pageviews via le hook usePathname() de Next.js.
 *
 * Région EU obligatoire (Frankfurt) pour conformité RGPD/nLPD —
 * configurée via NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com.
 *
 * La clé API publique est exposée dans le bundle JS (c'est le design
 * standard de Posthog — la clé publique ne permet QUE d'ingest des
 * events, pas de les lire). Pas un secret.
 */
"use client";

import posthog from "posthog-js";
import { PostHogProvider as Provider } from "posthog-js/react";
import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

let initialized = false;

function initPosthog() {
  if (initialized || typeof window === "undefined") return;
  if (!POSTHOG_KEY) return; // silent no-op si la config est absente

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    // Mode "history_change" : on capture les pageviews manuellement via le hook
    // ci-dessous (sinon Posthog rate les transitions SPA Next.js).
    capture_pageview: false,
    capture_pageleave: true,
    // Session recordings : utiles pour comprendre les frictions onboarding.
    session_recording: {
      maskAllInputs: true, // ⚠️ masque les passwords/emails/CB par défaut
      maskTextSelector: "[data-private]", // ajout possible côté composants sensibles
    },
    // Auto-capture : clicks/submits standard. On peut tracker des events
    // métier custom en plus avec posthog.capture(...).
    autocapture: true,
    // Persistence : cookie + localStorage (le bandeau cookies du site
    // doit l'autoriser → géré via opt-in plus tard si nécessaire).
    persistence: "localStorage+cookie",
    // Pas de bouton "Settings" Posthog côté dev
    disable_session_recording: process.env.NODE_ENV !== "production",
  });

  initialized = true;
}

/**
 * Provider Posthog : à monter dans le layout root.
 * Init le SDK + capture les pageviews à chaque navigation Next.js.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const lastIdentifiedId = useRef<string | null>(null);

  useEffect(() => {
    initPosthog();
  }, []);

  // Identify : associe la session Posthog au userId Fidlify dès que connu.
  // useSession() peut être lent à hydrater, on ne re-identify que si l'id change.
  useEffect(() => {
    if (!initialized || typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const u = session?.user as any;
    if (u?.id && u.id !== lastIdentifiedId.current) {
      posthog.identify(u.id, {
        email: u.email,
        name: u.name,
        plan: u.plan,
        role: u.role,
      });
      lastIdentifiedId.current = u.id;
    }
    if (!u?.id && lastIdentifiedId.current) {
      // Déconnexion : reset l'identification
      posthog.reset();
      lastIdentifiedId.current = null;
    }
  }, [session]);

  // Pageviews manuels (Next.js SPA → l'auto-capture ne déclenche pas sur
  // les transitions client-side, il faut le faire à la main).
  useEffect(() => {
    if (!initialized || typeof window === "undefined") return;
    let url = window.location.origin + pathname;
    if (searchParams?.toString()) {
      url += `?${searchParams.toString()}`;
    }
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  if (!POSTHOG_KEY) {
    // Pas de config → on rend les enfants sans wrapper Posthog
    return <>{children}</>;
  }

  return <Provider client={posthog}>{children}</Provider>;
}

/**
 * Capture un événement métier côté client.
 * No-op si Posthog n'est pas configuré.
 */
export function trackClientEvent(
  event: string,
  properties?: Record<string, unknown>
) {
  if (!initialized || typeof window === "undefined") return;
  posthog.capture(event, properties);
}

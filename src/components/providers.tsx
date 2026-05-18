"use client";

import { Suspense } from "react";
import { SessionProvider } from "next-auth/react";
import { CookiePreferencesProvider } from "@/components/cookies/CookiePreferencesProvider";
import { PostHogProvider } from "@/lib/analytics/posthog-client";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {/* Suspense requis car PostHogProvider utilise useSearchParams()
          (Next.js exige Suspense pour les hooks de routing dans un client component). */}
      <Suspense fallback={null}>
        <PostHogProvider>
          <CookiePreferencesProvider>{children}</CookiePreferencesProvider>
        </PostHogProvider>
      </Suspense>
    </SessionProvider>
  );
}

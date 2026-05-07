"use client";

import { SessionProvider } from "next-auth/react";
import { CookiePreferencesProvider } from "@/components/cookies/CookiePreferencesProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CookiePreferencesProvider>{children}</CookiePreferencesProvider>
    </SessionProvider>
  );
}

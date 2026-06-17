"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect, usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { CommandPalette } from "@/components/dashboard/CommandPalette";
import { PWARegister } from "@/components/dashboard/PWARegister";
import { ThemeProvider, useTheme } from "@/components/dashboard/theme";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <DashboardShell>{children}</DashboardShell>
    </ThemeProvider>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  // Le thème clair est le défaut ; on ne pose data-theme que pour le sombre.
  const themeAttr = theme === "dark" ? "dark" : undefined;
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mobileNavPathname, setMobileNavPathname] = useState<string | null>(null);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const pathname = usePathname();
  const mobileNavOpen = mobileNavPathname === pathname;
  const isOnboardingRoute = pathname === "/dashboard/onboarding";
  const isScanRoute = pathname === "/dashboard/scan"; // STAFF n'a accès qu'au scan

  // Vérifier l'onboarding du commerçant : redirection forcée si pas terminé
  // (sauf si on est déjà sur /dashboard/onboarding ou si rôle != USER)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (status !== "authenticated" || isOnboardingRoute || isScanRoute) {
      setOnboardingChecked(true);
      return;
    }
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (role !== "USER") {
      setOnboardingChecked(true);
      return;
    }
    fetch("/api/merchants/me")
      .then((r) => r.json())
      .then((data) => {
        if (data?.needsOnboarding) {
          router.replace("/dashboard/onboarding");
        } else {
          setOnboardingChecked(true);
        }
      })
      .catch(() => setOnboardingChecked(true));
  }, [status, session, isOnboardingRoute, isScanRoute, router, pathname]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Lock body scroll when drawer open + close on Escape
  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavPathname(null);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  if (status === "loading" || (!onboardingChecked && !isOnboardingRoute)) {
    return (
      <div className="dx-loading">
        <div className="dx-spinner" />
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  // L'onboarding utilise sa propre mise en page (plein écran, sans sidebar).
  if (isOnboardingRoute) {
    return <div className="dashboard" data-theme={themeAttr}>{children}</div>;
  }

  return (
    <div className="dashboard" data-theme={themeAttr}>
      <PWARegister />
      <CommandPalette />
      <div className="dx-shell">
        {/* Backdrop derrière le drawer mobile */}
        <div
          className={`dx-sidebar-backdrop${mobileNavOpen ? " visible" : ""}`}
          onClick={() => setMobileNavPathname(null)}
          aria-hidden={!mobileNavOpen}
        />

        <Sidebar
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavPathname(null)}
        />

        <div className="dx-main">
          <Header onOpenMobileNav={() => setMobileNavPathname(pathname)} />
          <main className="dx-content">{children}</main>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect, usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { CommandPalette } from "@/components/dashboard/CommandPalette";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const pathname = usePathname();
  const isOnboardingRoute = pathname === "/dashboard/onboarding";
  const isScanRoute = pathname === "/dashboard/scan"; // STAFF n'a accès qu'au scan

  // Auto-close drawer on route change
  /* eslint-disable-next-line react-hooks/set-state-in-effect */
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

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
      if (e.key === "Escape") setMobileNavOpen(false);
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
    return <div className="dashboard">{children}</div>;
  }

  return (
    <div className="dashboard">
      <CommandPalette />
      <div className="dx-shell">
        {/* Backdrop derrière le drawer mobile */}
        <div
          className={`dx-sidebar-backdrop${mobileNavOpen ? " visible" : ""}`}
          onClick={() => setMobileNavOpen(false)}
          aria-hidden={!mobileNavOpen}
        />

        <Sidebar
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />

        <div className="dx-main">
          <Header onOpenMobileNav={() => setMobileNavOpen(true)} />
          <main className="dx-content">{children}</main>
        </div>
      </div>
    </div>
  );
}

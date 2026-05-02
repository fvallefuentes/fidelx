"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect, usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  // Auto-close drawer on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

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

  if (status === "loading") {
    return (
      <div className="dx-loading">
        <div className="dx-spinner" />
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="dashboard">
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

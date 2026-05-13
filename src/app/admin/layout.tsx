"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect, usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [mobileNavPathname, setMobileNavPathname] = useState<string | null>(null);
  const pathname = usePathname();
  const mobileNavOpen = mobileNavPathname === pathname;

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

  if (status === "loading") {
    return (
      <div className="dx-loading">
        <div className="dx-spinner" />
      </div>
    );
  }

  if (!session) redirect("/login");

  const role = (session.user as { role?: string })?.role;
  if (role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="dashboard">
      <div className="dx-shell">
        <div
          className={`dx-sidebar-backdrop${mobileNavOpen ? " visible" : ""}`}
          onClick={() => setMobileNavPathname(null)}
          aria-hidden={!mobileNavOpen}
        />
        <AdminSidebar
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavPathname(null)}
        />
        <div className="dx-main">
          <AdminHeader onOpenMobileNav={() => setMobileNavPathname(pathname)} />
          <main className="dx-content">{children}</main>
        </div>
      </div>
    </div>
  );
}

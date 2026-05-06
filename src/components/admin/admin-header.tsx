"use client";

import { useSession } from "next-auth/react";
import { Menu, Shield } from "lucide-react";

export function AdminHeader({
  onOpenMobileNav,
}: {
  onOpenMobileNav?: () => void;
}) {
  const { data: session } = useSession();

  return (
    <header className="dx-header">
      <div className="dx-header-left">
        <div className="dx-header-eyebrow">
          <span className="dx-dot" />
          <span>ESPACE ADMIN</span>
        </div>
        <h2 className="dx-header-title">
          Bonjour,{" "}
          <em>{session?.user?.name || session?.user?.email || "Admin"}</em>
        </h2>
        <span
          className="dx-plan-pill paid"
          style={{
            background: "rgba(212,255,78,0.12)",
            borderColor: "rgba(212,255,78,0.25)",
            color: "#d4ff4e",
          }}
        >
          <Shield className="h-3.5 w-3.5" />
          Administrateur
        </span>
      </div>
      <div className="dx-header-right">
        <button
          type="button"
          className="dx-burger"
          aria-label="Ouvrir le menu"
          onClick={onOpenMobileNav}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

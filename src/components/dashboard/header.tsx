"use client";

import { useSession } from "next-auth/react";
import { Menu, Sparkles } from "lucide-react";

export function Header({
  onOpenMobileNav,
}: {
  onOpenMobileNav?: () => void;
}) {
  const { data: session } = useSession();
  const plan = session?.user?.plan || "FREE";

  return (
    <header className="dx-header">
      <div className="dx-header-left">
        <span className={`dx-plan-pill ${plan === "FREE" ? "free" : "paid"}`}>
          <Sparkles className="h-3.5 w-3.5" />
          {plan}
        </span>
        <div>
          <div className="dx-header-eyebrow">
            <span className="dx-dot" />
            <span>ESPACE COMMERÇANT</span>
          </div>
          <h2 className="dx-header-title">
            Bonjour, <em>{session?.user?.name || "Commerçant"}</em>
          </h2>
        </div>
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

"use client";

import { useSession } from "next-auth/react";
import { Sparkles } from "lucide-react";

export function Header() {
  const { data: session } = useSession();
  const plan = session?.user?.plan || "FREE";

  return (
    <header className="dx-header">
      <div>
        <div className="dx-header-eyebrow">
          <span className="dx-dot" />
          <span>ESPACE COMMERÇANT</span>
        </div>
        <h2 className="dx-header-title">
          Bonjour, <em>{session?.user?.name || "Commerçant"}</em>
        </h2>
      </div>
      <div className="dx-header-right">
        <span className={`dx-plan-pill ${plan === "FREE" ? "free" : "paid"}`}>
          <Sparkles className="h-3.5 w-3.5" />
          {plan}
        </span>
      </div>
    </header>
  );
}

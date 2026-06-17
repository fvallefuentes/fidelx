"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Menu, Sparkles, Search } from "lucide-react";
import { PLAN_LABELS } from "@/lib/plan-labels";
import { NotificationsBell } from "./NotificationsBell";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { ThemeToggle } from "./theme";

export function Header({
  onOpenMobileNav,
}: {
  onOpenMobileNav?: () => void;
}) {
  const { data: session } = useSession();
  const t = useTranslations("Dashboard.header");
  const plan = session?.user?.plan || "FREE";
  const [isMac] = useState(() =>
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform)
  );

  function openSearch() {
    // Déclenche le command palette en simulant Cmd/Ctrl+K
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: isMac,
      ctrlKey: !isMac,
      bubbles: true,
    });
    window.dispatchEvent(event);
  }

  return (
    <header className="dx-header">
      <div className="dx-header-left">
        <div className="dx-header-eyebrow">
          <span className="dx-dot" />
          <span>{t("eyebrow")}</span>
        </div>
        <h2 className="dx-header-title">
          {t("hello")} <em>{session?.user?.name || t("fallbackName")}</em>
        </h2>
        <span className={`dx-plan-pill ${plan === "FREE" ? "free" : "paid"}`}>
          <Sparkles className="h-3.5 w-3.5" />
          {PLAN_LABELS[plan] ?? plan}
        </span>
      </div>
      <div className="dx-header-right">
        <LanguageSwitcher compact />
        <ThemeToggle className="dx-theme-toggle" />
        <button
          type="button"
          onClick={openSearch}
          className="dx-header-search-btn"
          aria-label={t("searchLabel")}
          title={t("searchLabel")}
        >
          <Search className="h-[15px] w-[15px]" />
          <span>{t("search")}</span>
          <span className="cp-kbd">{isMac ? "⌘K" : "Ctrl K"}</span>
        </button>
        <NotificationsBell />
        <button
          type="button"
          className="dx-burger"
          aria-label={t("openMenu")}
          onClick={onOpenMobileNav}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

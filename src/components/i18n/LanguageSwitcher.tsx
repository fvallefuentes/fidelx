"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Check, Languages } from "lucide-react";
import { locales, type AppLocale } from "@/i18n/locales";

const SHOW_LANGUAGE_SWITCHER = false;

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const activeLocale = useLocale() as AppLocale;
  const t = useTranslations("Common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [settingLocale, setSettingLocale] = useState<AppLocale | null>(null);

  if (!SHOW_LANGUAGE_SWITCHER) return null;

  async function setLocale(locale: AppLocale) {
    setSettingLocale(locale);
    try {
      await fetch("/api/i18n/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      startTransition(() => router.refresh());
    } finally {
      setSettingLocale(null);
    }
  }

  return (
    <div className={`language-switcher${compact ? " compact" : ""}`} aria-label={t("language")}>
      <Languages className="language-switcher-icon" aria-hidden="true" />
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          className={`language-switcher-btn${activeLocale === locale ? " active" : ""}`}
          onClick={() => setLocale(locale)}
          disabled={pending || settingLocale !== null || activeLocale === locale}
          title={t(`languages.${locale}`)}
          aria-pressed={activeLocale === locale}
        >
          <span>{locale.toUpperCase()}</span>
          {activeLocale === locale && <Check className="language-switcher-check" aria-hidden="true" />}
        </button>
      ))}
    </div>
  );
}

"use client";

import { useCookiePreferences } from "./CookiePreferencesProvider";
import { useTranslations } from "next-intl";

/**
 * Bouton "Ouvrir le panneau cookies" — utilisé dans la Politique cookies
 * pour donner un accès direct aux préférences depuis le contenu.
 */
export default function OpenCookiePrefsButton() {
  const { open } = useCookiePreferences();
  const t = useTranslations("Cookies");
  return (
    <button
      type="button"
      onClick={open}
      className="btn btn-primary"
      style={{ padding: "10px 18px" }}
    >
      {t("manage")}
    </button>
  );
}

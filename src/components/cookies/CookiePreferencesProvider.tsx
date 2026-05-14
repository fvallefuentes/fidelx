"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

/**
 * Cookie management léger.
 *
 * État actuel (pré-tracking) : Fidlify n'utilise AUCUN cookie de mesure,
 * marketing ou profilage. Seuls les cookies strictement nécessaires
 * (NextAuth) sont déposés. Le module fournit néanmoins :
 * - une bannière d'information non-bloquante (accept "OK" ou en savoir plus)
 * - un point d'entrée "Gérer mes cookies" via le footer (modal)
 * - un état persisté localStorage 12 mois (clé fidlify_cookie_choice_v1)
 *
 * Le module est extensible : le jour où on ajoute analytics/marketing,
 * on étendra `CookieCategoryState` et on conditionnera l'injection de scripts
 * via le hook `useCookiePreferences().preferences`.
 */

const STORAGE_KEY = "fidlify_cookie_choice_v1";
const TTL_MS = 365 * 24 * 60 * 60 * 1000; // 12 mois

type CookieCategoryState = {
  necessary: true; // toujours actif, non désactivable
  // À ajouter quand on aura un analytics ou autre :
  // analytics: boolean;
  // marketing: boolean;
};

type StoredChoice = {
  preferences: CookieCategoryState;
  acknowledgedAt: number;
};

type Ctx = {
  /** True quand l'utilisateur a déjà reconnu la bannière. */
  hasChoice: boolean;
  /** Préférences actuelles. */
  preferences: CookieCategoryState;
  /** Marque la bannière comme reconnue. */
  acknowledge: () => void;
  /** Ouvre la modal de préférences. */
  open: () => void;
  /** Ferme la modal de préférences. */
  close: () => void;
  /** True si la modal est ouverte. */
  isOpen: boolean;
};

const defaultPreferences: CookieCategoryState = { necessary: true };

const CookieCtx = createContext<Ctx | null>(null);

function readStoredChoice(): StoredChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredChoice;
    if (
      !parsed ||
      typeof parsed.acknowledgedAt !== "number" ||
      Date.now() - parsed.acknowledgedAt > TTL_MS
    ) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredChoice(prefs: CookieCategoryState) {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredChoice = {
      preferences: prefs,
      acknowledgedAt: Date.now(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Stockage indispo (mode privé strict) : pas critique, on continue
  }
}

export function CookiePreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hasChoice, setHasChoice] = useState(true); // true initial pour éviter flash SSR
  const [preferences, setPreferences] =
    useState<CookieCategoryState>(defaultPreferences);
  const [isOpen, setIsOpen] = useState(false);

  // Hydratation client : lire le choix stocké dans localStorage.
  // localStorage n'est pas dispo côté serveur, donc on doit le faire dans
  // un effect après mount. setState direct dans l'effect est attendu ici
  // (c'est le pattern de bridge vers une API client-only).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const stored = readStoredChoice();
    if (stored) {
      setPreferences(stored.preferences);
      setHasChoice(true);
    } else {
      setHasChoice(false);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const acknowledge = useCallback(() => {
    writeStoredChoice(defaultPreferences);
    setPreferences(defaultPreferences);
    setHasChoice(true);
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo<Ctx>(
    () => ({ hasChoice, preferences, acknowledge, open, close, isOpen }),
    [hasChoice, preferences, acknowledge, open, close, isOpen]
  );

  return (
    <CookieCtx.Provider value={value}>
      {children}
      {!hasChoice && <CookieBanner />}
      {isOpen && <CookiePreferencesModal />}
    </CookieCtx.Provider>
  );
}

export function useCookiePreferences(): Ctx {
  const ctx = useContext(CookieCtx);
  if (!ctx) {
    throw new Error(
      "useCookiePreferences must be used within CookiePreferencesProvider"
    );
  }
  return ctx;
}

/* ─── Bannière (1ère visite) ─────────────────────────────── */
function CookieBanner() {
  const { acknowledge, open } = useCookiePreferences();
  const t = useTranslations("Cookies");

  return (
    <div role="dialog" aria-label={t("bannerLabel")} className="cookie-banner">
      <div className="cookie-banner-inner">
        <p className="cookie-banner-text">
          {t("bannerText")}{" "}
          <Link href="/politique-cookies" className="cookie-banner-link">
            {t("learnMore")}
          </Link>
          .
        </p>
        <div className="cookie-banner-actions">
          <button
            type="button"
            onClick={open}
            className="cookie-banner-btn cookie-banner-btn-ghost"
          >
            {t("preferences")}
          </button>
          <button
            type="button"
            onClick={acknowledge}
            className="cookie-banner-btn cookie-banner-btn-primary"
          >
            {t("understood")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Modal préférences (lien "Gérer mes cookies") ────────── */
function CookiePreferencesModal() {
  const { close, acknowledge } = useCookiePreferences();
  const t = useTranslations("Cookies");

  // Empêche le scroll du body quand la modal est ouverte
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Echap pour fermer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <div
      className="cookie-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-modal-title"
      onClick={close}
    >
      <div
        className="cookie-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cookie-modal-head">
          <h2 id="cookie-modal-title">{t("manage")}</h2>
          <button
            type="button"
            onClick={close}
            aria-label={t("close")}
            className="cookie-modal-close"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>

        <div className="cookie-modal-body">
          <p>{t("modalText")}</p>

          <div className="cookie-cat">
            <div className="cookie-cat-head">
              <div>
                <h3>{t("necessaryTitle")}</h3>
                <p className="cookie-cat-sub">
                  {t("necessaryDescription")}
                </p>
              </div>
              <span className="cookie-cat-badge">{t("alwaysActive")}</span>
            </div>
            <ul className="cookie-cat-list">
              <li>
                <code>next-auth.session-token</code> — {t("auth")}
                {" "}({t("days")})
              </li>
              <li>
                <code>next-auth.csrf-token</code> — {t("csrf")} ({t("session")})
              </li>
              <li>
                <code>next-auth.callback-url</code> — {t("redirect")} ({t("session")})
              </li>
            </ul>
          </div>

          <p className="cookie-modal-foot-note">
            {t("detailsPrefix")}{" "}
            <Link href="/politique-cookies" onClick={close}>
              {t("cookiePolicy")}
            </Link>{" "}
            {t("and")}{" "}
            <Link href="/politique-de-confidentialite" onClick={close}>
              {t("privacyPolicy")}
            </Link>
            .
          </p>
        </div>

        <footer className="cookie-modal-foot">
          <button
            type="button"
            onClick={() => {
              acknowledge();
              close();
            }}
            className="cookie-banner-btn cookie-banner-btn-primary"
          >
            {t("save")}
          </button>
        </footer>
      </div>
    </div>
  );
}

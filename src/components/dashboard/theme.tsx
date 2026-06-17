"use client";

import { createContext, useContext, useCallback, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";
const STORAGE_KEY = "fidlify-theme";

type ThemeCtx = { theme: Theme; toggle: () => void };
const ThemeContext = createContext<ThemeCtx>({ theme: "light", toggle: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * Fournit le thème du dashboard. Clair par défaut ; le choix est mémorisé
 * dans localStorage. La valeur `theme` est appliquée comme attribut
 * data-theme sur le conteneur `.dashboard` par le layout.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  // Hydrate depuis localStorage au montage (évite le mismatch SSR).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "dark" || saved === "light") setTheme(saved);
    } catch {
      /* localStorage indispo (mode privé strict) — on reste sur light */
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Bouton lune/soleil pour basculer clair ↔ sombre. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      className={className}
      aria-label={dark ? "Passer en mode clair" : "Passer en mode sombre"}
      title={dark ? "Mode clair" : "Mode sombre"}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

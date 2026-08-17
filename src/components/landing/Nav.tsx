"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Moon, Sun } from "lucide-react";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import LogoMark from "./LogoMark";

const THEME_KEY = "fidlify-theme";

type NavVariant = "default" | "handoff";

export default function Nav({ variant = "default" }: { variant?: NavVariant }) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const t = useTranslations("Landing.nav");
  const isHandoff = variant === "handoff";
  const handoffLanding = "/design-handoff/fidlify-landing/index.html";
  const links = isHandoff
    ? [
        { href: `${handoffLanding}#editeur`, label: t("personalization") },
        { href: `${handoffLanding}#adoption`, label: t("howItWorks") },
        { href: `${handoffLanding}#features`, label: t("features") },
        { href: `${handoffLanding}#pricing`, label: t("pricing") },
        { href: "/blog", label: t("blog") },
      ]
    : [
        { href: "/#solution", label: t("solution") },
        { href: "/#features", label: t("features") },
        { href: "/#demo", label: t("demo") },
        { href: "/#pricing", label: t("pricing") },
        { href: "/#faq", label: "FAQ" },
        { href: "/blog", label: t("blog") },
      ];

  // Lu une fois montee : la valeur reelle vient du script d'init dans
  // layout.tsx (evite le flash), on se contente ici de refleter l'etat.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setDark(document.documentElement.getAttribute("data-theme") === "dark");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const toggleTheme = () => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
      try {
        localStorage.setItem(THEME_KEY, next ? "dark" : "light");
      } catch {
        /* localStorage indispo (mode prive strict) — le choix ne persiste pas */
      }
      return next;
    });
  };

  // Close drawer on Escape, lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <nav className={`nav${isHandoff ? " nav-handoff" : ""}`}>
        <div className="wrap">
          <div className="nav-inner">
            <Link href={isHandoff ? handoffLanding : "/"} className="brand" onClick={close}>
              <LogoMark size={isHandoff ? 30 : 40} />
              <span>{isHandoff ? "Fidlify" : "FIDLIFY"}</span>
            </Link>

            {/* Desktop links — URLs absolues pour fonctionner depuis /blog aussi */}
            <div className="nav-links">
              {links.map((link) => (
                <Link key={link.href} href={link.href}>{link.label}</Link>
              ))}
            </div>

            {/* Desktop CTAs */}
            <div className="nav-cta">
              <button
                type="button"
                className="theme-toggle"
                onClick={toggleTheme}
                aria-label={dark ? t("lightMode") : t("darkMode")}
                title={t("themeToggle")}
              >
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <LanguageSwitcher compact />
              <Link href="/login" className="nav-btn-login">
                {t("login")}
              </Link>
              <Link href="/register" className="nav-btn-cta">
                {t("tryFree")}
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              className={`nav-burger${open ? " open" : ""}`}
              aria-label={open ? t("closeMenu") : t("openMenu")}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer + backdrop */}
      <div
        className={`nav-backdrop${open ? " visible" : ""}`}
        onClick={close}
        aria-hidden={!open}
      />
      <aside
        className={`nav-drawer${open ? " open" : ""}`}
        aria-hidden={!open}
        role="dialog"
        aria-label={t("navigation")}
      >
        <div className="nav-drawer-head">
          <Link href={isHandoff ? handoffLanding : "/"} className="brand" onClick={close}>
            <LogoMark size={36} />
            <span>{isHandoff ? "Fidlify" : "FIDLIFY"}</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={dark ? t("lightMode") : t("darkMode")}
              title={t("themeToggle")}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              type="button"
              className="nav-drawer-close"
              aria-label={t("closeMenu")}
              onClick={close}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>

        <nav className="nav-drawer-links">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={close}>{link.label}</Link>
          ))}
        </nav>

        <div className="nav-drawer-cta">
          <LanguageSwitcher />
          <Link href="/login" className="nav-btn-login" onClick={close}>
            {t("login")}
          </Link>
          <Link href="/register" className="nav-btn-cta" onClick={close}>
            {t("tryFree")}
          </Link>
        </div>
      </aside>
    </>
  );
}

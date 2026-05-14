"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import LogoMark from "./LogoMark";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("Landing.nav");

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
      <nav className="nav">
        <div className="wrap">
          <div className="nav-inner">
            <Link href="/" className="brand" onClick={close}>
              <LogoMark size={40} />
              <span>FIDLIFY</span>
            </Link>

            {/* Desktop links */}
            <div className="nav-links">
              <a href="#solution">{t("solution")}</a>
              <a href="#features">{t("features")}</a>
              <a href="#demo">{t("demo")}</a>
              <a href="#pricing">{t("pricing")}</a>
              <a href="#faq">FAQ</a>
            </div>

            {/* Desktop CTAs */}
            <div className="nav-cta">
              <LanguageSwitcher compact />
              <Link
                href="/login"
                className="btn btn-ghost"
                style={{ height: 40, padding: "0 18px", fontSize: 14 }}
              >
                {t("login")}
              </Link>
              <Link
                href="/register"
                className="btn btn-primary"
                style={{ height: 40, padding: "0 18px", fontSize: 14 }}
              >
                {t("tryFree")}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m13 5 7 7-7 7"/></svg>
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
          <Link href="/" className="brand" onClick={close}>
            <LogoMark size={36} />
            <span>FIDLIFY</span>
          </Link>
          <button
            type="button"
            className="nav-drawer-close"
            aria-label={t("closeMenu")}
            onClick={close}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <nav className="nav-drawer-links">
          <a href="#solution" onClick={close}>{t("solution")}</a>
          <a href="#features" onClick={close}>{t("features")}</a>
          <a href="#demo" onClick={close}>{t("demo")}</a>
          <a href="#pricing" onClick={close}>{t("pricing")}</a>
          <a href="#faq" onClick={close}>FAQ</a>
        </nav>

        <div className="nav-drawer-cta">
          <LanguageSwitcher />
          <Link href="/login" className="btn btn-ghost" onClick={close} style={{ width: "100%", justifyContent: "center" }}>
            {t("login")}
          </Link>
          <Link href="/register" className="btn btn-primary" onClick={close} style={{ width: "100%", justifyContent: "center" }}>
            {t("tryFree")}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m13 5 7 7-7 7"/></svg>
          </Link>
        </div>
      </aside>
    </>
  );
}

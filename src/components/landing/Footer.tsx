"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import LogoMark from "@/components/landing/LogoMark";
import { LEGAL_PAGES, PUBLIC_CONTACT_EMAIL } from "@/lib/legal";
import { useCookiePreferences } from "@/components/cookies/CookiePreferencesProvider";
import NewsletterForm from "@/components/newsletter/NewsletterForm";

/**
 * Footer global utilisé sur la landing et toutes les pages publiques.
 * - Liens légaux réels (4 pages publiées)
 * - Bouton "Gérer mes cookies" qui rouvre la modal de préférences
 * - Pas de CGV / DPA tant qu'ils ne sont pas publiés
 */
export default function Footer() {
  const { open: openCookiePrefs } = useCookiePreferences();
  const t = useTranslations("Landing.footer");

  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-inner">
          <div className="footer-top">
            <div>
              <div className="brand" style={{ marginBottom: 16 }}>
                <LogoMark size={40} />
                <span>FIDLIFY</span>
              </div>
              <p
                style={{
                  color: "var(--ink-3)",
                  fontSize: 13,
                  lineHeight: 1.6,
                  maxWidth: 280,
                  margin: 0,
                }}
              >
                {t("description")}
              </p>
              <div style={{ marginTop: 20 }}>
                <h5 style={{ fontSize: 13, margin: "0 0 8px", color: "var(--ink-2)" }}>
                  Newsletter
                </h5>
                <p style={{ fontSize: 12, color: "var(--ink-3)", margin: "0 0 10px", maxWidth: 280 }}>
                  Articles fidélisation + nouveautés produit. 1-2 emails / mois max, désabo en 1 clic.
                </p>
                <NewsletterForm source="footer" />
              </div>
            </div>

            <div>
              <h5>{t("product")}</h5>
              <ul>
                <li>
                  <Link href="/#features">{t("links.features")}</Link>
                </li>
                <li>
                  <Link href="/#pricing">{t("links.pricing")}</Link>
                </li>
                <li>
                  <Link href="/#demo">{t("links.demo")}</Link>
                </li>
                <li>
                  <Link href="/#faq">FAQ</Link>
                </li>
                <li>
                  <Link href="/blog">Blog</Link>
                </li>
              </ul>
            </div>

            <div>
              <h5>{t("account")}</h5>
              <ul>
                <li>
                  <Link href="/register">{t("createAccount")}</Link>
                </li>
                <li>
                  <Link href="/login">{t("links.login")}</Link>
                </li>
                <li>
                  <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>{t("contact")}</a>
                </li>
              </ul>
            </div>

            <div>
              <h5>{t("legal")}</h5>
              <ul>
                {LEGAL_PAGES.map((p) => (
                  <li key={p.href}>
                    <Link href={p.href}>{t(`legalLinks.${p.href.slice(1)}`)}</Link>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={openCookiePrefs}
                    className="footer-link-btn"
                    aria-label={t("manageCookiesLabel")}
                  >
                    {t("manageCookies")}
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} FIDLIFY · {t("madeIn")} · {t("compliance")}
            </span>
            <span style={{ color: "var(--ink-4)" }}>{PUBLIC_CONTACT_EMAIL}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

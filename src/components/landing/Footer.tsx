"use client";

import Link from "next/link";
import LogoMark from "@/components/landing/LogoMark";
import { LEGAL_PAGES, PUBLIC_CONTACT_EMAIL } from "@/lib/legal";
import { useCookiePreferences } from "@/components/cookies/CookiePreferencesProvider";

/**
 * Footer global utilisé sur la landing et toutes les pages publiques.
 * - Liens légaux réels (4 pages publiées)
 * - Bouton "Gérer mes cookies" qui rouvre la modal de préférences
 * - Pas de CGV / DPA tant qu'ils ne sont pas publiés
 */
export default function Footer() {
  const { open: openCookiePrefs } = useCookiePreferences();

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
                Logiciel de fidélisation SaaS pour les commerçants de Suisse romande.
                Carte de fidélité digitale Apple Wallet et Google Wallet,
                sans application à télécharger.
              </p>
            </div>

            <div>
              <h5>Produit</h5>
              <ul>
                <li>
                  <Link href="/#features">Fonctionnalités</Link>
                </li>
                <li>
                  <Link href="/#pricing">Tarifs</Link>
                </li>
                <li>
                  <Link href="/#demo">Démo</Link>
                </li>
                <li>
                  <Link href="/#faq">FAQ</Link>
                </li>
              </ul>
            </div>

            <div>
              <h5>Compte</h5>
              <ul>
                <li>
                  <Link href="/register">Créer un compte</Link>
                </li>
                <li>
                  <Link href="/login">Connexion</Link>
                </li>
                <li>
                  <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>Contact</a>
                </li>
              </ul>
            </div>

            <div>
              <h5>Légal</h5>
              <ul>
                {LEGAL_PAGES.map((p) => (
                  <li key={p.href}>
                    <Link href={p.href}>{p.short}</Link>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={openCookiePrefs}
                    className="footer-link-btn"
                    aria-label="Ouvrir la fenêtre de gestion des cookies"
                  >
                    Gérer mes cookies
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} FIDLIFY · Conçu en Suisse romande 🇨🇭 ·
              Conformité LPD/RGPD
            </span>
            <span style={{ color: "var(--ink-4)" }}>{PUBLIC_CONTACT_EMAIL}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

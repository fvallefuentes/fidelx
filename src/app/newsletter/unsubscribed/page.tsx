import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Désabonnement effectué",
  robots: { index: false, follow: false },
};

export default function NewsletterUnsubscribedPage() {
  return (
    <div className="newsletter-status">
      <div className="newsletter-status-card">
        <div className="newsletter-status-icon">✓</div>
        <h1>Désabonnement effectué</h1>
        <p>
          Vous ne recevrez plus la newsletter Fidlify. Vos données restent
          conservées le temps légal puis seront supprimées.
        </p>
        <p style={{ fontSize: 14, opacity: 0.7 }}>
          Vous pourrez vous réinscrire à tout moment depuis notre site.
        </p>
        <Link href="/" className="newsletter-status-cta">
          Retour à Fidlify →
        </Link>
      </div>
    </div>
  );
}

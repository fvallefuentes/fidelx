import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Inscription confirmée",
  robots: { index: false, follow: false },
};

export default function NewsletterOkPage() {
  return (
    <div className="newsletter-status">
      <div className="newsletter-status-card">
        <div className="newsletter-status-icon">✓</div>
        <h1>Inscription confirmée</h1>
        <p>
          Merci ! Vous êtes désormais inscrit à la newsletter Fidlify. Vous
          recevrez les prochains articles, guides et nouveautés produit
          directement dans votre boîte mail.
        </p>
        <p style={{ fontSize: 14, opacity: 0.7 }}>
          Vous pourrez vous désabonner à tout moment via le lien présent dans
          chaque email.
        </p>
        <Link href="/blog" className="newsletter-status-cta">
          Lire les articles →
        </Link>
      </div>
    </div>
  );
}

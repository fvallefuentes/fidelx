import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Lien invalide",
  robots: { index: false, follow: false },
};

function ErrorContent({ reason }: { reason: string }) {
  return (
    <div className="newsletter-status">
      <div className="newsletter-status-card">
        <div className="newsletter-status-icon error">!</div>
        <h1>Lien invalide ou expiré</h1>
        <p>{reason || "Ce lien n'est plus valide."}</p>
        <p style={{ fontSize: 14, opacity: 0.7 }}>
          Si vous vouliez confirmer votre inscription, réinscrivez-vous depuis
          notre site — vous recevrez un nouveau lien.
        </p>
        <Link href="/" className="newsletter-status-cta">
          Retour à Fidlify →
        </Link>
      </div>
    </div>
  );
}

export default async function NewsletterErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason = "" } = await searchParams;
  return (
    <Suspense fallback={null}>
      <ErrorContent reason={decodeURIComponent(reason)} />
    </Suspense>
  );
}

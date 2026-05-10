import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateGoogleWalletLink } from "@/lib/wallet/google";
import LogoMark from "@/components/landing/LogoMark";

/**
 * Page publique de récupération de carte.
 *
 * Permet à un client qui a perdu sa carte Wallet (suppression accidentelle,
 * changement de téléphone) de la réinstaller avec sa progression intacte.
 *
 * Sécurité : URL contenant un serialNumber à ~62 bits d'entropie, donc
 * unguessable. Pas indexée (robots.txt disallow + meta noindex).
 *
 * Idempotence : Apple/Google Wallet détectent le même passTypeId/objectId
 * et remplacent le pass existant. La progression (tampons, points, visites,
 * cashback) reste en DB et est rechargée automatiquement dans le pass.
 */

export const metadata: Metadata = {
  title: "Récupération de carte de fidélité",
  description:
    "Réinstallez votre carte de fidélité Fidlify dans votre Wallet — votre progression est conservée.",
  robots: { index: false, follow: false },
};

export default async function CardRecoveryPage({
  params,
}: {
  params: Promise<{ serialNumber: string }>;
}) {
  const { serialNumber } = await params;

  const card = await prisma.loyaltyCard.findUnique({
    where: { serialNumber },
    select: {
      id: true,
      serialNumber: true,
      currentStamps: true,
      currentPoints: true,
      totalVisits: true,
      status: true,
      client: { select: { firstName: true } },
      program: {
        select: {
          id: true,
          name: true,
          type: true,
          config: true,
          isActive: true,
          merchant: { select: { name: true } },
        },
      },
    },
  });

  if (!card) {
    notFound();
  }

  const isRecoverable =
    card.program.isActive &&
    card.status !== "REVOKED" &&
    card.status !== "EXPIRED";

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://www.fidlify.com";
  const walletUrl = isRecoverable
    ? `${appUrl}/api/wallet/apple/${card.serialNumber}.pkpass`
    : null;
  const googleWalletUrl = isRecoverable
    ? await generateGoogleWalletLink(card.id)
    : null;

  const programType = card.program.type;
  const config = card.program.config as { maxStamps?: number };
  const maxStamps = Math.max(1, Math.min(20, config.maxStamps ?? 10));

  return (
    <div className="join-shell">
      <div className="join-main">
        <header className="join-brand-bar">
          <Link href="/" className="join-brand">
            <LogoMark size={32} />
            <span>FIDLIFY</span>
          </Link>
        </header>

        <div className="join-card">
          <div className="join-eyebrow">
            <span className="join-dot" /> {card.program.merchant.name}
          </div>

          {!isRecoverable ? (
            <>
              <h1 className="join-h1">Carte indisponible.</h1>
              <p className="join-sub">
                Cette carte n&apos;est plus active. Veuillez contacter directement{" "}
                <strong>{card.program.merchant.name}</strong> pour en savoir
                plus.
              </p>
            </>
          ) : (
            <>
              <h1 className="join-h1">Récupérez votre carte.</h1>
              <p className="join-sub">
                Bonjour <strong>{card.client.firstName}</strong> 👋 — votre
                progression est conservée. Réinstallez votre carte de fidélité{" "}
                <strong>{card.program.name}</strong> dans votre Wallet en un
                tap.
              </p>

              {/* Progression actuelle */}
              <div className="recovery-progress">
                <div className="recovery-progress-label">VOTRE PROGRESSION</div>
                {programType === "STAMPS" ? (
                  <>
                    <div className="recovery-stamps">
                      {Array.from({ length: maxStamps }).map((_, i) => (
                        <span
                          key={i}
                          className={`recovery-stamp${
                            i < card.currentStamps ? " full" : ""
                          }`}
                        >
                          {i < card.currentStamps && (
                            <svg
                              viewBox="0 0 24 24"
                              width="60%"
                              height="60%"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          )}
                        </span>
                      ))}
                    </div>
                    <div className="recovery-progress-value">
                      <strong>{card.currentStamps}</strong> / {maxStamps}{" "}
                      tampons
                    </div>
                  </>
                ) : (
                  <div className="recovery-progress-value">
                    <strong>{card.currentPoints}</strong> points
                  </div>
                )}
                <div className="recovery-progress-meta">
                  {card.totalVisits} visite
                  {card.totalVisits > 1 ? "s" : ""} enregistrée
                  {card.totalVisits > 1 ? "s" : ""}
                </div>
              </div>

              <div className="join-actions">
                {walletUrl && (
                  <a href={walletUrl} className="join-btn-apple">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.39c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.39-1.32 2.76-2.53 4zm-3.1-17.24c-2.22.22-4.03 2.46-3.79 4.5 2.04.16 4.09-2.16 3.79-4.5z" />
                    </svg>
                    Ajouter à Apple Wallet
                  </a>
                )}
                {googleWalletUrl && (
                  <a href={googleWalletUrl} className="join-btn-google">
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Ajouter à Google Wallet
                  </a>
                )}
              </div>

              <p className="join-fineprint">
                Votre carte sera réinstallée à l&apos;identique avec votre
                progression actuelle. Rien à refaire.
              </p>
            </>
          )}
        </div>
      </div>
      <footer className="join-footer">
        <Link href="/" className="join-brand-tiny">
          <LogoMark size={20} />
          <span>FIDLIFY</span>
        </Link>
        <span>Made in Switzerland</span>
      </footer>
    </div>
  );
}

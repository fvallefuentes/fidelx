import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getReviewEligibility } from "@/lib/google-review";
import LogoMark from "@/components/landing/LogoMark";
import ReviewButton from "@/components/review/ReviewButton";

export const metadata: Metadata = {
  title: "Laisser un avis",
  robots: { index: false, follow: false },
};

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ serialNumber: string }>;
}) {
  const { serialNumber } = await params;

  const card = await prisma.loyaltyCard.findUnique({
    where: { serialNumber },
    select: {
      client: { select: { firstName: true } },
      program: {
        select: { name: true, merchant: { select: { name: true } } },
      },
    },
  });
  if (!card) notFound();

  const elig = await getReviewEligibility(serialNumber);
  const merchantName = card.program.merchant.name ?? "le commerce";
  const bonusLabel =
    elig.bonus && elig.bonusType
      ? elig.bonusType === "stamps"
        ? `${elig.bonus} tampon${elig.bonus > 1 ? "s" : ""}`
        : `${elig.bonus} point${elig.bonus > 1 ? "s" : ""}`
      : "un bonus";

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
            <span className="join-dot" /> {merchantName}
          </div>

          {renderBody()}

          <p className="join-fineprint">
            Bonus offert pour le dépôt d&apos;un avis, qu&apos;il soit positif ou
            négatif. Aucune obligation de note. Conformément aux règles Google
            et au droit suisse.
          </p>
        </div>
      </div>

      <footer className="join-footer">
        <Link href="/" className="join-brand-tiny">
          <LogoMark size={20} />
          <span>FIDLIFY</span>
        </Link>
        <span>Fait en Suisse romande 🇨🇭</span>
      </footer>
    </div>
  );

  function renderBody() {
    // Cas : éligible → on propose l'avis
    if (elig.eligible && elig.reviewUrl) {
      return (
        <>
          <h1 className="join-h1">
            Gagnez {bonusLabel} 🎁
          </h1>
          <p className="join-sub">
            Bonjour {card!.client.firstName ?? ""}, merci pour votre fidélité chez{" "}
            {merchantName} ! Laissez un avis Google et recevez{" "}
            <strong>{bonusLabel}</strong> sur votre carte de fidélité.
          </p>
          <ReviewButton
            serialNumber={serialNumber}
            reviewUrl={elig.reviewUrl}
            bonusLabel={bonusLabel}
          />
        </>
      );
    }

    // Cas : déjà demandé, en attente de validation
    if (elig.reason === "already_requested") {
      return (
        <>
          <h1 className="join-h1">Avis en cours de validation ⏳</h1>
          <p className="join-sub">
            Vous avez déjà demandé votre bonus avis. {merchantName} le validera
            après avoir vérifié votre avis — votre bonus de {bonusLabel} sera
            ajouté à votre carte.
          </p>
        </>
      );
    }

    // Cas : bonus déjà reçu
    if (elig.reason === "already_confirmed") {
      return (
        <>
          <h1 className="join-h1">Bonus déjà reçu ✓</h1>
          <p className="join-sub">
            Vous avez déjà bénéficié du bonus avis pour cette carte. Merci pour
            votre soutien !
          </p>
        </>
      );
    }

    // Cas : pas assez de visites
    if (elig.reason === "not_enough_visits") {
      return (
        <>
          <h1 className="join-h1">Encore un peu de patience 😊</h1>
          <p className="join-sub">
            Le bonus avis sera disponible après {elig.minVisits} visites. Vous en
            êtes à {elig.currentVisits}. Revenez bientôt !
          </p>
        </>
      );
    }

    // Cas : pas disponible (review désactivé ou pas de Place ID)
    return (
      <>
        <h1 className="join-h1">Avis indisponible</h1>
        <p className="join-sub">
          Le programme d&apos;avis n&apos;est pas actif pour ce commerce pour le
          moment.
        </p>
      </>
    );
  }
}

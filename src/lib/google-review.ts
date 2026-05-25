/**
 * Récompense contre avis Google.
 *
 * Flow (validation manuelle par le merchant) :
 *  1. Le client, après N visites, voit un encart sur /avis/[serialNumber]
 *  2. Il clique "Laisser un avis" → ouvre Google Reviews + crée un
 *     GoogleReviewRequest (status SENT)
 *  3. Le merchant voit la demande dans son dashboard, vérifie l'avis sur
 *     sa fiche Google, puis valide (CONFIRMED + crédit) ou rejette (REJECTED)
 *
 * ⚠️ Conformité :
 *  - Google interdit le "review gating" (récompenser uniquement les avis
 *    positifs). On récompense le fait de laisser UN avis, quel qu'il soit.
 *  - LCD suisse : transparence — le client sait que c'est une incitation.
 *
 * Le type de bonus (tampons vs points) est déterminé automatiquement par
 * le type de programme : STAMPS/HYBRID → tampons, POINTS/CASHBACK → points.
 */
import { prisma } from "@/lib/prisma";

/**
 * Construit l'URL d'écriture d'avis Google à partir d'un Place ID.
 * Format officiel qui ouvre directement la fenêtre "écrire un avis".
 */
export function buildGoogleReviewUrl(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

export type ReviewEligibility = {
  eligible: boolean;
  reason?:
    | "not_enabled"
    | "no_place_id"
    | "not_enough_visits"
    | "already_requested"
    | "already_confirmed";
  reviewUrl?: string;
  bonus?: number;
  bonusType?: "stamps" | "points";
  minVisits?: number;
  currentVisits?: number;
};

/** Détermine si le bonus est en tampons ou en points selon le type de programme. */
function bonusTypeForProgram(type: string): "stamps" | "points" {
  return type === "POINTS" || type === "CASHBACK" ? "points" : "stamps";
}

/**
 * Évalue si une carte est éligible à proposer un avis Google.
 * Vérifie : programme actif + review activé + place ID dispo + assez de
 * visites + pas déjà demandé/confirmé.
 */
export async function getReviewEligibility(
  serialNumber: string
): Promise<ReviewEligibility> {
  const card = await prisma.loyaltyCard.findUnique({
    where: { serialNumber },
    select: {
      id: true,
      totalVisits: true,
      program: {
        select: {
          type: true,
          googleReviewEnabled: true,
          googleReviewBonus: true,
          googleReviewMinVisits: true,
          establishment: { select: { googlePlaceId: true } },
        },
      },
    },
  });

  if (!card) return { eligible: false, reason: "not_enabled" };

  const p = card.program;
  if (!p.googleReviewEnabled) return { eligible: false, reason: "not_enabled" };

  const placeId = p.establishment?.googlePlaceId;
  if (!placeId) return { eligible: false, reason: "no_place_id" };

  const bonusType = bonusTypeForProgram(p.type);
  const base = {
    reviewUrl: buildGoogleReviewUrl(placeId),
    bonus: p.googleReviewBonus,
    bonusType,
    minVisits: p.googleReviewMinVisits,
    currentVisits: card.totalVisits,
  };

  if (card.totalVisits < p.googleReviewMinVisits) {
    return { eligible: false, reason: "not_enough_visits", ...base };
  }

  // A-t-il déjà une demande en cours ou confirmée ?
  const existing = await prisma.googleReviewRequest.findFirst({
    where: { cardId: card.id, status: { in: ["SENT", "CONFIRMED"] } },
    select: { status: true },
  });
  if (existing?.status === "CONFIRMED") {
    return { eligible: false, reason: "already_confirmed", ...base };
  }
  if (existing?.status === "SENT") {
    return { eligible: false, reason: "already_requested", ...base };
  }

  return { eligible: true, ...base };
}

/**
 * Crée une demande d'avis (status SENT) quand le client clique sur le bouton.
 * Idempotent : si une demande SENT/CONFIRMED existe déjà, ne crée rien.
 */
export async function createReviewRequest(
  serialNumber: string
): Promise<{ ok: boolean; reason?: string }> {
  const elig = await getReviewEligibility(serialNumber);
  if (!elig.eligible) {
    return { ok: false, reason: elig.reason };
  }

  const card = await prisma.loyaltyCard.findUnique({
    where: { serialNumber },
    select: { id: true, program: { select: { type: true, googleReviewBonus: true } } },
  });
  if (!card) return { ok: false, reason: "not_found" };

  const bonusType = bonusTypeForProgram(card.program.type);

  await prisma.googleReviewRequest.create({
    data: {
      cardId: card.id,
      status: "SENT",
      bonusStamps: bonusType === "stamps" ? card.program.googleReviewBonus : 0,
      bonusPoints: bonusType === "points" ? card.program.googleReviewBonus : 0,
    },
  });

  return { ok: true };
}

/* ============================================================
 * CÔTÉ MERCHANT — validation
 * ============================================================ */

export type PendingReview = {
  id: string;
  clientName: string;
  programName: string;
  bonusStamps: number;
  bonusPoints: number;
  bonusLabel: string;
  serialNumber: string;
  sentAt: string;
};

/** Liste les demandes d'avis en attente de validation pour un merchant. */
export async function listPendingReviews(
  merchantId: string
): Promise<PendingReview[]> {
  const rows = await prisma.googleReviewRequest.findMany({
    where: {
      status: "SENT",
      card: { program: { merchantId } },
    },
    orderBy: { sentAt: "desc" },
    take: 100,
    select: {
      id: true,
      bonusStamps: true,
      bonusPoints: true,
      sentAt: true,
      card: {
        select: {
          serialNumber: true,
          client: { select: { firstName: true } },
          program: { select: { name: true } },
        },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    clientName: r.card.client.firstName ?? "Client",
    programName: r.card.program.name,
    bonusStamps: r.bonusStamps,
    bonusPoints: r.bonusPoints,
    bonusLabel:
      r.bonusStamps > 0
        ? `${r.bonusStamps} tampon${r.bonusStamps > 1 ? "s" : ""}`
        : `${r.bonusPoints} point${r.bonusPoints > 1 ? "s" : ""}`,
    serialNumber: r.card.serialNumber,
    sentAt: r.sentAt.toISOString(),
  }));
}

/**
 * Valide une demande d'avis : crédite le bonus sur la carte, crée une
 * transaction GOOGLE_REVIEW_BONUS, met à jour le pass Wallet.
 * Sécurisé : vérifie que la demande appartient bien à un programme du merchant.
 */
export async function confirmReviewRequest(
  requestId: string,
  merchantId: string
): Promise<{ ok: boolean; reason?: string }> {
  const request = await prisma.googleReviewRequest.findFirst({
    where: { id: requestId, card: { program: { merchantId } } },
    select: {
      id: true,
      status: true,
      bonusStamps: true,
      bonusPoints: true,
      cardId: true,
      card: { select: { serialNumber: true } },
    },
  });
  if (!request) return { ok: false, reason: "not_found" };
  if (request.status !== "SENT") return { ok: false, reason: "already_processed" };

  // Crédit du bonus sur la carte
  await prisma.loyaltyCard.update({
    where: { id: request.cardId },
    data: {
      currentStamps: { increment: request.bonusStamps },
      currentPoints: { increment: request.bonusPoints },
    },
  });

  // Transaction tracée
  await prisma.transaction.create({
    data: {
      cardId: request.cardId,
      type: "GOOGLE_REVIEW_BONUS",
      value: request.bonusStamps > 0 ? request.bonusStamps : request.bonusPoints,
      notes: "Bonus avis Google validé par le commerçant",
    },
  });

  // Marque la demande comme confirmée
  await prisma.googleReviewRequest.update({
    where: { id: request.id },
    data: { status: "CONFIRMED", confirmedAt: new Date() },
  });

  // Mise à jour des pass Wallet (non bloquant)
  try {
    const { notifyPassUpdate } = await import("@/lib/wallet/push");
    await notifyPassUpdate(request.cardId);
  } catch { /* non bloquant */ }
  try {
    const { updateGoogleWalletObject } = await import("@/lib/wallet/google");
    await updateGoogleWalletObject(request.card.serialNumber);
  } catch { /* non bloquant */ }

  return { ok: true };
}

/** Rejette une demande d'avis (le merchant n'a pas trouvé l'avis). */
export async function rejectReviewRequest(
  requestId: string,
  merchantId: string
): Promise<{ ok: boolean; reason?: string }> {
  const request = await prisma.googleReviewRequest.findFirst({
    where: { id: requestId, card: { program: { merchantId } } },
    select: { id: true, status: true },
  });
  if (!request) return { ok: false, reason: "not_found" };
  if (request.status !== "SENT") return { ok: false, reason: "already_processed" };

  await prisma.googleReviewRequest.update({
    where: { id: request.id },
    data: { status: "REJECTED" },
  });

  return { ok: true };
}

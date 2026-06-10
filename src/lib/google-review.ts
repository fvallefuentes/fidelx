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
 * le type de programme : STAMPS → tampons, POINTS/CASHBACK → points.
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

/* ============================================================
 * INVITATION AUTO (au moment où le client atteint le seuil)
 * ============================================================ */

/**
 * À appeler après l'ajout d'un tampon/point. Si le client vient d'atteindre
 * le seuil de visites configuré ET qu'il n'a pas déjà été invité, on lui
 * pousse une notification Wallet (Apple + Google) l'invitant à laisser un
 * avis Google, avec le lien vers /avis/[serialNumber].
 *
 * Idempotent via le flag reviewInvitedAt : 1 seule invitation par carte
 * (sinon on spammerait à chaque visite après le seuil).
 *
 * @returns true si une invitation a été envoyée
 */
export async function maybeInviteToReview(cardId: string): Promise<boolean> {
  const card = await prisma.loyaltyCard.findUnique({
    where: { id: cardId },
    select: {
      id: true,
      serialNumber: true,
      totalVisits: true,
      reviewInvitedAt: true,
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

  if (!card) return false;
  const p = card.program;

  // Conditions d'invitation
  if (!p.googleReviewEnabled) return false;
  if (!p.establishment?.googlePlaceId) return false;
  if (card.reviewInvitedAt) return false; // déjà invité
  if (card.totalVisits < p.googleReviewMinVisits) return false;

  // Pas d'invitation si déjà confirmé (bonus déjà reçu)
  const confirmed = await prisma.googleReviewRequest.findFirst({
    where: { cardId: card.id, status: "CONFIRMED" },
    select: { id: true },
  });
  if (confirmed) return false;

  const bonusType = bonusTypeForProgram(p.type);
  const bonusLabel =
    bonusType === "stamps"
      ? `${p.googleReviewBonus} tampon${p.googleReviewBonus > 1 ? "s" : ""}`
      : `${p.googleReviewBonus} point${p.googleReviewBonus > 1 ? "s" : ""}`;

  // Lien direct vers la page d'écriture d'avis Google — l'ancien lien
  // /avis/[serialNumber] ajoutait une étape Fidlify intermédiaire que le
  // client devait cliquer pour qu'on crée le GoogleReviewRequest. Maintenant
  // on crée la demande dès l'invitation (voir plus bas) et le lien envoie
  // direct sur Google.
  const reviewLink = buildGoogleReviewUrl(p.establishment.googlePlaceId);
  const message = `Laissez un avis Google et gagnez ${bonusLabel} ! ${reviewLink}`;

  // 1. Marque la carte comme invitée + stocke le message (affiché au verso du pass)
  await prisma.loyaltyCard.update({
    where: { id: card.id },
    data: {
      reviewInvitedAt: new Date(),
      lastMessage: message,
      lastMessageAt: new Date(),
    },
  });

  // 1bis. Crée immédiatement la GoogleReviewRequest (status SENT) → le client
  // apparaît dans /dashboard/avis dès qu'il est invité, sans devoir cliquer
  // sur un bouton Fidlify. Le merchant vérifie ensuite manuellement sur sa
  // fiche Google si l'avis a été déposé puis valide/rejette.
  // Idempotent : on skip si une demande SENT/CONFIRMED existe déjà.
  try {
    const already = await prisma.googleReviewRequest.findFirst({
      where: { cardId: card.id, status: { in: ["SENT", "CONFIRMED"] } },
      select: { id: true },
    });
    if (!already) {
      await prisma.googleReviewRequest.create({
        data: {
          cardId: card.id,
          status: "SENT",
          bonusStamps: bonusType === "stamps" ? p.googleReviewBonus : 0,
          bonusPoints: bonusType === "points" ? p.googleReviewBonus : 0,
        },
      });
    }
  } catch (e) {
    console.error("[review-invite] reviewRequest create failed:", e);
  }

  // 2. Push Apple (APNs background → refetch) + sync Google object
  try {
    const { notifyPassUpdate } = await import("@/lib/wallet/push");
    await notifyPassUpdate(card.id);
  } catch (e) {
    console.error("[review-invite] notifyPassUpdate failed:", e);
  }

  // 3. Notification visible Google Wallet (addMessage = vraie notif Android)
  try {
    const { sendGoogleWalletMessage } = await import("@/lib/wallet/google");
    await sendGoogleWalletMessage(
      card.serialNumber,
      `Gagnez ${bonusLabel} 🎁`,
      message
    );
  } catch (e) {
    console.error("[review-invite] sendGoogleWalletMessage failed:", e);
  }

  return true;
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

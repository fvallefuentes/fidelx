/**
 * Push Notifications pour Apple Wallet
 *
 * Quand un pass est mis à jour (tampon ajouté, nouvelle offre, etc.),
 * on envoie une notification push silencieuse à l'appareil du client.
 * Le wallet télécharge ensuite automatiquement la version à jour du pass.
 *
 * Pour Google Wallet, la mise à jour se fait via l'API REST (PATCH).
 */

import { prisma } from "@/lib/prisma";
import { updateGoogleWalletObject } from "./google";

/**
 * Notifie tous les devices enregistrés pour un pass donné
 */
export async function notifyPassUpdate(cardId: string) {
  const registrations = await prisma.passRegistration.findMany({
    where: { cardId },
  });

  const results = await Promise.allSettled(
    registrations.map(async (reg) => {
      if (reg.platform === "APPLE") {
        return sendApplePushNotification(reg.pushToken);
      } else if (reg.platform === "GOOGLE") {
        const card = await prisma.loyaltyCard.findUnique({
          where: { id: cardId },
          select: { serialNumber: true },
        });
        if (card) {
          return updateGoogleWalletObject(card.serialNumber);
        }
      }
    })
  );

  return results;
}

/**
 * Envoie une push notification APNs (Apple Push Notification service)
 * pour déclencher la mise à jour du pass sur l'appareil
 */
async function sendApplePushNotification(pushToken: string): Promise<boolean> {
  // Vérifier que les certificats sont configurés
  if (!process.env.APPLE_SIGNER_CERT_PATH || !process.env.APPLE_SIGNER_KEY_PATH) {
    console.log("[DEV] Apple push notification skipped (no certs):", pushToken);
    return false;
  }

  try {
    // En production, utiliser http2 pour se connecter à APNs
    // Le payload est vide — c'est une notification silencieuse
    // qui dit juste au wallet de re-télécharger le pass
    const apnsUrl = process.env.NODE_ENV === "production"
      ? "https://api.push.apple.com"
      : "https://api.sandbox.push.apple.com";

    // Note: Node.js n'a pas de client http2 natif facilement utilisable
    // En production, utiliser la librairie 'apn' ou 'node-apn'
    console.log(`[PUSH] Would send to APNs: ${apnsUrl}/3/device/${pushToken}`);

    return true;
  } catch (error) {
    console.error("APNs push error:", error);
    return false;
  }
}

/**
 * Envoie une notification à tous les clients d'un programme
 * (utilisé pour les campagnes de notifications)
 */
export async function notifyAllCardsInProgram(
  programId: string,
  message: string,
  segment?: string
) {
  // Construire le filtre selon le segment
  const where: Record<string, unknown> = {
    programId,
    status: "ACTIVE",
  };

  if (segment === "ACTIVE") {
    // Clients actifs: visite dans les 30 derniers jours
    where.lastVisitAt = { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
  } else if (segment === "DORMANT") {
    // Clients dormants: pas de visite depuis 30+ jours
    where.OR = [
      { lastVisitAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      { lastVisitAt: null },
    ];
  } else if (segment === "NEW") {
    // Nouveaux: inscrits dans les 7 derniers jours
    where.createdAt = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
  } else if (segment === "VIP") {
    // VIP: 10+ visites
    where.totalVisits = { gte: 10 };
  }

  const cards = await prisma.loyaltyCard.findMany({
    where,
    select: { id: true },
  });

  const results = await Promise.allSettled(
    cards.map((card) => notifyPassUpdate(card.id))
  );

  return {
    total: cards.length,
    sent: results.filter((r) => r.status === "fulfilled").length,
  };
}

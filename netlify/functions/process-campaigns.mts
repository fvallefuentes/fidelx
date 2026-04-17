import { PrismaClient } from "../../src/generated/prisma";

// Netlify Scheduled Function — s'exécute toutes les 5 minutes
// Déclenche les campagnes SCHEDULED dont l'heure est passée
export default async () => {
  const prisma = new PrismaClient();

  try {
    const now = new Date();

    const dueCampaigns = await prisma.notificationCampaign.findMany({
      where: {
        triggerType: "SCHEDULED",
        status: "SCHEDULED",
        scheduledAt: { lte: now },
      },
      include: {
        program: { select: { id: true } },
      },
    });

    console.log(`[process-campaigns] ${dueCampaigns.length} campagne(s) à traiter`);

    for (const campaign of dueCampaigns) {
      if (!campaign.programId) continue;

      const where: Record<string, unknown> = {
        programId: campaign.programId,
        status: "ACTIVE",
      };

      const segment = campaign.targetSegment;
      if (segment === "ACTIVE") {
        where.lastVisitAt = { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
      } else if (segment === "DORMANT") {
        where.OR = [
          { lastVisitAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
          { lastVisitAt: null },
        ];
      } else if (segment === "NEW") {
        where.createdAt = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
      } else if (segment === "VIP") {
        where.totalVisits = { gte: 10 };
      }

      const cards = await prisma.loyaltyCard.findMany({ where, select: { id: true } });

      // Mettre à jour le lastMessage sur chaque carte
      await prisma.loyaltyCard.updateMany({
        where: { id: { in: cards.map((c) => c.id) } },
        data: { lastMessage: campaign.message },
      });

      // Envoyer les push APNs
      const { notifyPassUpdate } = await import("../../src/lib/wallet/push");
      await Promise.allSettled(cards.map((c) => notifyPassUpdate(c.id)));

      // Marquer la campagne comme envoyée
      await prisma.notificationCampaign.update({
        where: { id: campaign.id },
        data: { status: "SENT", sentAt: new Date(), sentCount: cards.length },
      });

      console.log(`[process-campaigns] campagne "${campaign.name}" envoyée à ${cards.length} client(s)`);
    }
  } catch (err) {
    console.error("[process-campaigns] erreur:", err);
  } finally {
    await prisma.$disconnect();
  }
};

export const config = {
  schedule: "*/5 * * * *",
};

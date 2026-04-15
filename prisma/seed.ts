import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const dbUrl = process.env.NEON_URL || process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL!;
console.log("Connecting to:", dbUrl.replace(/\/\/.*@/, "//***@"));
const adapter = new PrismaPg(dbUrl);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Créer le commerçant demo
  const passwordHash = await bcrypt.hash("demo1234", 12);

  const merchant = await prisma.user.upsert({
    where: { email: "demo@fidelx.ch" },
    update: {},
    create: {
      email: "demo@fidelx.ch",
      name: "Boulangerie du Lac",
      passwordHash,
      phone: "+41 79 123 45 67",
      language: "fr",
      currency: "CHF",
      plan: "PRO",
    },
  });

  console.log("Merchant created:", merchant.email);

  // Créer l'établissement
  const establishment = await prisma.establishment.upsert({
    where: { id: "demo-est-1" },
    update: {},
    create: {
      id: "demo-est-1",
      merchantId: merchant.id,
      name: "Boulangerie du Lac - Centre",
      address: "Rue du Lac 12, 1000 Lausanne",
      phone: "+41 21 123 45 67",
      latitude: 46.519,
      longitude: 6.6323,
    },
  });

  // Créer le programme à tampons
  const program = await prisma.loyaltyProgram.upsert({
    where: { id: "demo-prog-1" },
    update: {},
    create: {
      id: "demo-prog-1",
      merchantId: merchant.id,
      establishmentId: establishment.id,
      name: "Carte Croissant",
      type: "STAMPS",
      config: { maxStamps: 10, reward: "1 croissant offert" },
      cardDesign: {
        bgColor: "#1a1a2e",
        textColor: "#ffffff",
        description: "Collectez 10 tampons, recevez un croissant offert !",
      },
      googleReviewEnabled: true,
      googleReviewBonus: 2,
      googleReviewMinVisits: 3,
    },
  });

  // Créer la récompense
  await prisma.reward.upsert({
    where: { id: "demo-reward-1" },
    update: {},
    create: {
      id: "demo-reward-1",
      programId: program.id,
      name: "1 croissant offert",
      description: "Un croissant au beurre offert à votre prochaine visite",
      threshold: 10,
      rewardType: "FREE_ITEM",
    },
  });

  // Créer des clients de démo
  const clientsData = [
    { firstName: "Marie", email: "marie@example.ch", stamps: 7, visits: 7 },
    { firstName: "Lucas", email: "lucas@example.ch", stamps: 4, visits: 5 },
    { firstName: "Sophie", email: "sophie@example.ch", stamps: 9, visits: 12 },
    { firstName: "Thomas", email: "thomas@example.ch", stamps: 2, visits: 2 },
    { firstName: "Julie", email: "julie@example.ch", stamps: 6, visits: 8 },
    { firstName: "Marc", email: "marc@example.ch", stamps: 1, visits: 1 },
    { firstName: "Emma", email: "emma@example.ch", stamps: 10, visits: 15 },
    { firstName: "Nicolas", email: "nicolas@example.ch", stamps: 3, visits: 3 },
    { firstName: "Léa", email: "lea@example.ch", stamps: 5, visits: 6 },
    { firstName: "Antoine", email: "antoine@example.ch", stamps: 8, visits: 11 },
    { firstName: "Clara", email: "clara@example.ch", stamps: 0, visits: 0 },
    { firstName: "Pierre", email: "pierre@example.ch", stamps: 6, visits: 9 },
  ];

  for (const cd of clientsData) {
    const client = await prisma.client.upsert({
      where: { id: `demo-client-${cd.email}` },
      update: {},
      create: {
        id: `demo-client-${cd.email}`,
        firstName: cd.firstName,
        email: cd.email,
      },
    });

    const serial = `FX-${cd.firstName.toUpperCase().slice(0, 4)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const daysAgo = Math.floor(Math.random() * 60);
    const lastVisit = cd.visits > 0
      ? new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
      : null;

    const card = await prisma.loyaltyCard.upsert({
      where: {
        clientId_programId: {
          clientId: client.id,
          programId: program.id,
        },
      },
      update: {},
      create: {
        clientId: client.id,
        programId: program.id,
        serialNumber: serial,
        currentStamps: cd.stamps >= 10 ? 0 : cd.stamps,
        totalVisits: cd.visits,
        lastVisitAt: lastVisit,
        status: "ACTIVE",
      },
    });

    // Créer quelques transactions
    for (let i = 0; i < cd.visits; i++) {
      const txDate = new Date(
        Date.now() - (daysAgo + i * 3) * 24 * 60 * 60 * 1000
      );
      await prisma.transaction.create({
        data: {
          cardId: card.id,
          establishmentId: establishment.id,
          type: "STAMP",
          value: 1,
          amountSpent: 3.5 + Math.random() * 8,
          createdAt: txDate,
        },
      });
    }
  }

  console.log(`${clientsData.length} clients created with cards and transactions`);

  // Créer quelques campagnes de démo
  await prisma.notificationCampaign.upsert({
    where: { id: "demo-campaign-1" },
    update: {},
    create: {
      id: "demo-campaign-1",
      merchantId: merchant.id,
      programId: program.id,
      name: "Happy Hour vendredi",
      message: "Ce vendredi 17h-19h : croissants à 2 CHF ! Passez nous voir !",
      triggerType: "SCHEDULED",
      triggerConfig: { sendAt: "2026-04-18T15:00:00Z" },
      targetSegment: "ALL",
      status: "SCHEDULED",
      scheduledAt: new Date("2026-04-18T15:00:00Z"),
    },
  });

  await prisma.notificationCampaign.upsert({
    where: { id: "demo-campaign-2" },
    update: {},
    create: {
      id: "demo-campaign-2",
      merchantId: merchant.id,
      programId: program.id,
      name: "Relance clients dormants",
      message:
        "Ça fait un moment ! Revenez et recevez un tampon bonus sur votre carte.",
      triggerType: "INACTIVITY",
      triggerConfig: { daysInactive: 30 },
      targetSegment: "DORMANT",
      status: "SENT",
      sentCount: 4,
      sentAt: new Date("2026-04-10T10:00:00Z"),
    },
  });

  await prisma.notificationCampaign.upsert({
    where: { id: "demo-campaign-3" },
    update: {},
    create: {
      id: "demo-campaign-3",
      merchantId: merchant.id,
      programId: program.id,
      name: "Notification proximité",
      message: "Vous êtes tout près ! Encore 3 tampons pour votre croissant offert.",
      triggerType: "GEOFENCE",
      triggerConfig: { radiusM: 500 },
      targetSegment: "ACTIVE",
      status: "SENT",
      sentCount: 18,
      sentAt: new Date("2026-04-12T09:00:00Z"),
    },
  });

  console.log("3 demo campaigns created");
  console.log("\n✅ Seed complete!");
  console.log("---");
  console.log("Connexion: demo@fidelx.ch / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

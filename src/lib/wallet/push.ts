import { prisma } from "@/lib/prisma";
import {
  sendGoogleWalletMessage,
  updateGoogleWalletClass,
  updateGoogleWalletObject,
} from "./google";
import { buildCampaignAudienceWhere, type CampaignSegment } from "@/lib/campaign-audience";
import * as http2 from "http2";

type GoogleVisibleMessage = {
  header: string;
  body: string;
};

export type WalletDeliveryResult = {
  appleRegistrations: number;
  applePushSent: boolean;
  applePushFailures: number;
  googleObjectUpdated: boolean;
  googleMessageAccepted: boolean;
  errors: string[];
};

export async function notifyPassUpdate(
  cardId: string,
  googleMessage?: GoogleVisibleMessage
): Promise<WalletDeliveryResult> {
  // Apple : on n'envoie l'APNs push QUE si on a une registration (le device
  // s'est enregistré via le web service Apple Wallet en téléchargeant le pass).
  const registrations = await prisma.passRegistration.findMany({
    where: { cardId, platform: "APPLE" },
  });

  const applePushes = registrations.map((reg) =>
    sendApplePushNotification(reg.pushToken)
  );

  // Google : pas de notion de "registration" — Google Wallet ne notifie
  // jamais l'issuer quand un user ajoute un pass. On patch toujours l'objet
  // côté API ; si la carte existe dans le wallet d'un user, Google la
  // resynchronise automatiquement. updateGoogleWalletObject est lui-même
  // un upsert qui crée l'objet via POST insert s'il n'existe pas encore.
  const card = await prisma.loyaltyCard.findUnique({
    where: { id: cardId },
    select: { serialNumber: true, programId: true },
  });
  const googleUpdate = async () => {
    if (!card) return { objectUpdated: false, messageAccepted: false };
    const objectUpdated = await updateGoogleWalletObject(card.serialNumber);
    let messageAccepted = false;
    if (googleMessage?.body && objectUpdated) {
      await updateGoogleWalletClass(card.programId);
      messageAccepted = await sendGoogleWalletMessage(
        card.serialNumber,
        googleMessage.header,
        googleMessage.body
      );
    }
    return { objectUpdated, messageAccepted };
  };

  const [appleResults, googleResult] = await Promise.allSettled([
    Promise.allSettled(applePushes),
    googleUpdate(),
  ]);

  const settledApple =
    appleResults.status === "fulfilled" ? appleResults.value : [];
  const applePushSent = settledApple.some(
    (result) => result.status === "fulfilled" && result.value
  );
  const applePushFailures = settledApple.filter(
    (result) => result.status === "rejected" || !result.value
  ).length;
  const google =
    googleResult.status === "fulfilled"
      ? googleResult.value
      : { objectUpdated: false, messageAccepted: false };

  return {
    appleRegistrations: registrations.length,
    applePushSent,
    applePushFailures,
    googleObjectUpdated: google.objectUpdated,
    googleMessageAccepted: google.messageAccepted,
    errors: [
      ...(appleResults.status === "rejected"
        ? [`Apple: ${(appleResults.reason as Error)?.message || "erreur push"}`]
        : []),
      ...(googleResult.status === "rejected"
        ? [`Google: ${(googleResult.reason as Error)?.message || "erreur Wallet"}`]
        : []),
    ],
  };
}

export function buildNotificationLogUpdate(
  result: WalletDeliveryResult,
  now = new Date()
) {
  const delivered = result.applePushSent || result.googleMessageAccepted;
  const walletStatus = result.applePushSent
    ? "SENT"
    : result.googleMessageAccepted
      ? "ACCEPTED"
      : result.appleRegistrations === 0 && !result.googleObjectUpdated
        ? "NO_DEVICE"
        : "FAILED";

  return {
    delivered,
    deliveredAt: delivered ? now : null,
    walletStatus,
    appleStatus:
      result.appleRegistrations === 0
        ? "NO_DEVICE"
        : result.applePushSent
          ? "SENT"
          : "FAILED",
    applePushSentAt: result.applePushSent ? now : null,
    googleStatus: result.googleMessageAccepted
      ? "ACCEPTED"
      : result.googleObjectUpdated
        ? "OBJECT_UPDATED"
        : "FAILED",
    googleAcceptedAt: result.googleMessageAccepted ? now : null,
    errorMessage: result.errors.length > 0 ? result.errors.join(" | ") : null,
  };
}

async function sendApplePushNotification(pushToken: string): Promise<boolean> {
  const { APPLE_CERTS } = await import("./certs");

  const host = "api.push.apple.com";
  const passTypeId = process.env.APPLE_PASS_TYPE_ID!;

  // Chaîne complète : cert signataire + WWDR (intermédiaire Apple)
  const certChain = Buffer.concat([
    APPLE_CERTS.signerCert,
    Buffer.from("\n"),
    APPLE_CERTS.wwdr,
  ]);

  return new Promise((resolve) => {
    const client = http2.connect(`https://${host}`, {
      key: APPLE_CERTS.signerKey,
      cert: certChain,
    });
    const finish = (result: boolean) => {
      clearTimeout(timeout);
      client.close();
      resolve(result);
    };

    const timeout = setTimeout(() => {
      console.error("[APNs] timeout");
      finish(false);
    }, 10000);

    client.on("error", (err) => {
      console.error("[APNs] connection error:", err.message);
      finish(false);
    });

    const payload = Buffer.from("{}");

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${pushToken}`,
      "apns-topic": passTypeId,
      "apns-push-type": "background",
      "apns-priority": "5",
      "content-type": "application/json",
      "content-length": String(payload.length),
    });

    req.write(payload);
    req.end();

    let status = 0;
    let body = "";
    req.on("response", (headers) => {
      status = headers[":status"] as number;
    });

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      if (status === 200) {
        console.log("[APNs] push sent:", pushToken.slice(0, 8) + "...");
        finish(true);
      } else if (status === 410) {
        // Token mort : l'utilisateur a supprimé le pass de son Wallet
        // → on supprime la registration pour ne plus jamais re-pousser
        console.log(
          `[APNs] device removed pass (410) — cleaning token ${pushToken.slice(0, 8)}…`
        );
        try {
          await prisma.passRegistration.deleteMany({ where: { pushToken } });
        } catch (err) {
          console.error("[APNs] cleanup failed:", err);
        }
        finish(false);
      } else {
        console.error(`[APNs] push failed, status: ${status} ${body}`);
        finish(false);
      }
    });

    req.on("error", (err) => {
      console.error("[APNs] request error:", err.message);
      finish(false);
    });

  });
}

export async function notifyCardInProgram(
  programId: string,
  cardId: string,
  message: string,
  title: string,
  campaignId?: string
) {
  const card = await prisma.loyaltyCard.findFirst({
    where: {
      id: cardId,
      programId,
      status: { in: ["ACTIVE", "REWARD_PENDING"] },
    },
    select: {
      id: true,
      program: { select: { name: true } },
    },
  });

  if (!card) return { total: 0, sent: 0 };

  const deliveredAt = new Date();
  const log = await prisma.notificationLog.create({
    data: {
      campaignId: campaignId || undefined,
      cardId: card.id,
      messageSnapshot: message,
    },
  });

  await prisma.loyaltyCard.update({
    where: { id: card.id },
    data: { lastMessage: message, lastMessageAt: deliveredAt },
  });

  const result = await notifyPassUpdate(card.id, {
    header: title || card.program.name,
    body: message,
  });
  const current = await prisma.notificationLog.findUnique({
    where: { id: log.id },
    select: { applePassSyncedAt: true },
  });
  await prisma.notificationLog.update({
    where: { id: log.id },
    data: {
      ...buildNotificationLogUpdate(result, deliveredAt),
      ...(current?.applePassSyncedAt
        ? { walletStatus: "SYNCED", appleStatus: "SYNCED" }
        : {}),
    },
  });

  return { total: 1, sent: 1 };
}

export async function notifyAllCardsInProgram(
  programId: string,
  message: string,
  segment?: string,
  title?: string,
  campaignId?: string
) {
  const cards = await prisma.loyaltyCard.findMany({
    where: buildCampaignAudienceWhere(programId, segment as CampaignSegment),
    select: {
      id: true,
      program: { select: { name: true } },
    },
  });

  // Mettre à jour le champ message sur chaque carte pour déclencher la notif
  // (le logo de la carte vient toujours du programme, pas de la campagne)
  const deliveredAt = new Date();

  await Promise.allSettled(
    cards.map(async (card) => {
      const log = campaignId
        ? await prisma.notificationLog.create({
            data: {
              campaignId,
              cardId: card.id,
              messageSnapshot: message,
            },
          })
        : null;
      await prisma.loyaltyCard.update({
        where: { id: card.id },
        data: { lastMessage: message, lastMessageAt: deliveredAt },
      });
      const result = await notifyPassUpdate(card.id, {
          header: title || card.program.name,
          body: message,
      });
      if (log) {
        const current = await prisma.notificationLog.findUnique({
          where: { id: log.id },
          select: { applePassSyncedAt: true },
        });
        await prisma.notificationLog.update({
          where: { id: log.id },
          data: {
            ...buildNotificationLogUpdate(result, deliveredAt),
            ...(current?.applePassSyncedAt
              ? { walletStatus: "SYNCED", appleStatus: "SYNCED" }
              : {}),
          },
        });
      }
    })
  );

  return { total: cards.length, sent: cards.length };
}

export async function notifyCardsInProgram(
  programId: string,
  cardIds: string[],
  message: string,
  title?: string,
  cooldownDays = 0,
  campaignId?: string
) {
  const uniqueCardIds = [...new Set(cardIds)].filter(Boolean);
  if (uniqueCardIds.length === 0) {
    return { total: 0, sent: 0 };
  }

  const cards = await prisma.loyaltyCard.findMany({
    where: {
      ...buildCampaignAudienceWhere(programId, "ALL", uniqueCardIds),
      ...(cooldownDays > 0
        ? {
            OR: [
              { lastMessageAt: null },
              { lastMessageAt: { lt: new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000) } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      program: { select: { name: true } },
    },
  });

  const deliveredAt = new Date();

  await Promise.allSettled(
    cards.map(async (card) => {
      const log = campaignId
        ? await prisma.notificationLog.create({
            data: {
              campaignId,
              cardId: card.id,
              messageSnapshot: message,
            },
          })
        : null;
      await prisma.loyaltyCard.update({
        where: { id: card.id },
        data: { lastMessage: message, lastMessageAt: deliveredAt },
      });
      const result = await notifyPassUpdate(card.id, {
          header: title || card.program.name,
          body: message,
      });
      if (log) {
        const current = await prisma.notificationLog.findUnique({
          where: { id: log.id },
          select: { applePassSyncedAt: true },
        });
        await prisma.notificationLog.update({
          where: { id: log.id },
          data: {
            ...buildNotificationLogUpdate(result, deliveredAt),
            ...(current?.applePassSyncedAt
              ? { walletStatus: "SYNCED", appleStatus: "SYNCED" }
              : {}),
          },
        });
      }
    })
  );

  return { total: uniqueCardIds.length, sent: cards.length };
}

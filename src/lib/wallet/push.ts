import { prisma } from "@/lib/prisma";
import { updateGoogleWalletObject } from "./google";
import * as http2 from "http2";

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
        if (card) return updateGoogleWalletObject(card.serialNumber);
      }
    })
  );

  return results;
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

    client.on("error", (err) => {
      console.error("[APNs] connection error:", err.message);
      resolve(false);
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
      client.close();
      if (status === 200) {
        console.log("[APNs] push sent:", pushToken.slice(0, 8) + "...");
        resolve(true);
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
        resolve(false);
      } else {
        console.error(`[APNs] push failed, status: ${status} ${body}`);
        resolve(false);
      }
    });

    req.on("error", (err) => {
      client.close();
      console.error("[APNs] request error:", err.message);
      resolve(false);
    });

    // Timeout 10s
    setTimeout(() => {
      client.close();
      console.error("[APNs] timeout");
      resolve(false);
    }, 10000);
  });
}

export async function notifyAllCardsInProgram(
  programId: string,
  message: string,
  segment?: string
) {
  const where: Record<string, unknown> = { programId, status: "ACTIVE" };

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

  const cards = await prisma.loyaltyCard.findMany({
    where,
    select: { id: true },
  });

  // Mettre à jour le champ message sur chaque carte pour déclencher la notif
  await Promise.allSettled(
    cards.map((card) =>
      prisma.loyaltyCard.update({
        where: { id: card.id },
        data: { lastMessage: message },
      }).then(() => notifyPassUpdate(card.id))
    )
  );

  return { total: cards.length, sent: cards.length };
}

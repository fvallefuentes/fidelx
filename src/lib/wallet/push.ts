/**
 * Push Notifications pour Apple Wallet + Google Wallet
 *
 * Apple : envoie un push silencieux APNs (HTTP/2 mTLS) qui demande
 *         à l'appareil de re-télécharger le pass. Le pass nouvellement
 *         généré contient le `lastMessage` au verso avec un
 *         `changeMessage` → iOS affiche la notif.
 *
 * Google : utilise l'endpoint dédié `addMessage` qui pousse une vraie
 *          notification visible sur Android.
 */

import { prisma } from "@/lib/prisma";
import { updateGoogleWalletObject, sendGoogleWalletMessage } from "./google";
import * as fs from "fs";
import * as http2 from "http2";

/* ──────────────────────────────────────────────────────────
   Public API
   ────────────────────────────────────────────────────────── */

/**
 * Notifie tous les devices enregistrés pour un pass.
 * Si `message` est fourni, il est sauvegardé sur la carte (visible
 * dans le pass après refresh) et envoyé en notif Google addMessage.
 */
export async function notifyPassUpdate(cardId: string, message?: string) {
  // 1. Sauvegarder le message sur la carte si fourni — il sera affiché
  //    au verso du pass Apple lors du re-fetch et déclenchera la notif iOS
  if (message) {
    await prisma.loyaltyCard.update({
      where: { id: cardId },
      data: { lastMessage: message, lastMessageAt: new Date() },
    });
  }

  const card = await prisma.loyaltyCard.findUnique({
    where: { id: cardId },
    select: {
      serialNumber: true,
      registrations: { select: { platform: true, pushToken: true } },
      program: { select: { name: true } },
    },
  });
  if (!card) return [];

  const tasks = card.registrations.map(async (reg) => {
    if (reg.platform === "APPLE") {
      return sendApplePushNotification(reg.pushToken);
    }
    if (reg.platform === "GOOGLE") {
      // 1. Patch the loyalty object so the latest stamps/points are visible
      await updateGoogleWalletObject(card.serialNumber);
      // 2. If there is a campaign message, push it as an Android notification
      if (message) {
        return sendGoogleWalletMessage(
          card.serialNumber,
          card.program.name,
          message
        );
      }
      return true;
    }
  });

  return Promise.allSettled(tasks);
}

/**
 * Envoie une campagne à tous les clients d'un programme.
 */
export async function notifyAllCardsInProgram(
  programId: string,
  message: string,
  segment?: string
) {
  const where: Record<string, unknown> = {
    programId,
    status: "ACTIVE",
  };

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (segment === "ACTIVE") {
    where.lastVisitAt = { gte: new Date(now - 30 * day) };
  } else if (segment === "DORMANT") {
    where.OR = [
      { lastVisitAt: { lt: new Date(now - 30 * day) } },
      { lastVisitAt: null },
    ];
  } else if (segment === "NEW") {
    where.createdAt = { gte: new Date(now - 7 * day) };
  } else if (segment === "VIP") {
    where.totalVisits = { gte: 10 };
  }

  const cards = await prisma.loyaltyCard.findMany({
    where,
    select: { id: true },
  });

  // Push en parallèle, par batch de 25 pour éviter de saturer APNs
  const batchSize = 25;
  let sent = 0;
  for (let i = 0; i < cards.length; i += batchSize) {
    const batch = cards.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((c) => notifyPassUpdate(c.id, message))
    );
    sent += results.filter((r) => r.status === "fulfilled").length;
  }

  return { total: cards.length, sent };
}

/* ──────────────────────────────────────────────────────────
   Apple Push Notification service (APNs) — HTTP/2 + mTLS
   ────────────────────────────────────────────────────────── */

let apnsClient: http2.ClientHttp2Session | null = null;
let apnsClientConfigError: string | null = null;

/**
 * Crée (ou réutilise) une session HTTP/2 vers APNs avec mTLS.
 * Apple recommande de garder une connexion ouverte pour envoyer
 * plusieurs notifications.
 */
function getApnsClient(): http2.ClientHttp2Session | null {
  if (apnsClient && !apnsClient.closed && !apnsClient.destroyed) {
    return apnsClient;
  }
  apnsClient = null;

  const certPath = process.env.APPLE_SIGNER_CERT_PATH;
  const keyPath = process.env.APPLE_SIGNER_KEY_PATH;
  const passphrase = process.env.APPLE_SIGNER_KEY_PASSPHRASE || undefined;

  if (!certPath || !keyPath) {
    apnsClientConfigError = "Apple signer cert/key paths not configured";
    return null;
  }
  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    apnsClientConfigError = `Apple cert/key files not found at ${certPath} / ${keyPath}`;
    return null;
  }

  const apnsHost =
    process.env.NODE_ENV === "production"
      ? "https://api.push.apple.com"
      : "https://api.sandbox.push.apple.com";

  try {
    apnsClient = http2.connect(apnsHost, {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
      passphrase,
    });
    apnsClient.on("error", (err) => {
      console.error("[APNs] connection error:", err.message);
      apnsClient = null;
    });
    apnsClient.on("close", () => {
      apnsClient = null;
    });
    apnsClientConfigError = null;
    return apnsClient;
  } catch (err) {
    apnsClientConfigError = `Failed to connect to APNs: ${
      err instanceof Error ? err.message : String(err)
    }`;
    apnsClient = null;
    return null;
  }
}

/**
 * Envoie une notif APNs silencieuse pour qu'iOS re-télécharge le pass.
 * Le payload est `{}` — pour les passes wallet, il n'y a pas d'alerte
 * à fournir; iOS gère lui-même l'affichage si un champ a un changeMessage.
 */
async function sendApplePushNotification(pushToken: string): Promise<boolean> {
  const client = getApnsClient();
  if (!client) {
    console.log(
      `[APNs] skipped (${apnsClientConfigError || "no client"}) for token ${pushToken.slice(0, 8)}…`
    );
    return false;
  }

  const topic = process.env.APPLE_PASS_TYPE_ID;
  if (!topic) {
    console.log("[APNs] APPLE_PASS_TYPE_ID not set");
    return false;
  }

  return new Promise<boolean>((resolve) => {
    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${pushToken}`,
      "apns-topic": topic, // doit matcher le passTypeIdentifier
      "apns-push-type": "background",
      "apns-priority": "5",
      "content-type": "application/json",
    });

    let status = 0;
    let body = "";
    req.on("response", (headers) => {
      status = Number(headers[":status"] || 0);
    });
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      if (status >= 200 && status < 300) {
        resolve(true);
      } else {
        console.warn(
          `[APNs] device ${pushToken.slice(0, 8)}… → status ${status} ${body}`
        );
        resolve(false);
      }
    });
    req.on("error", (err) => {
      console.error("[APNs] request error:", err.message);
      resolve(false);
    });

    req.end(JSON.stringify({})); // payload vide = silent push
  });
}

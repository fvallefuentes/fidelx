/**
 * Google Wallet Pass Generation
 *
 * Utilise l'API Google Wallet pour créer des cartes de fidélité.
 * Nécessite un compte Google Cloud + service account.
 *
 * Gratuit — pas de frais par pass ni par API call.
 */

import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { getTemplate } from "@/lib/wallet/templates";

const GOOGLE_WALLET_ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID || "";
const GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL =
  process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL || "";
const GOOGLE_WALLET_SERVICE_ACCOUNT_KEY =
  process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY || "";

interface LoyaltyClassData {
  programId: string;
  programName: string;
  merchantName: string;
  bgColor: string;
  logoUrl?: string;
  heroImageUrl?: string;
}

interface BackFieldEntry {
  label: string;
  value: string;
}

function isBackFieldArray(value: unknown): value is BackFieldEntry[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as Record<string, unknown>).label === "string" &&
      typeof (item as Record<string, unknown>).value === "string"
  );
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "field";
}

interface LoyaltyObjectData {
  serialNumber: string;
  classId: string;
  clientName: string;
  currentStamps: number;
  maxStamps: number;
  currentPoints: number;
  programType: string;
}

/**
 * Crée une classe de carte de fidélité Google Wallet
 * (une classe par programme — partagée par tous les clients)
 */
export function buildLoyaltyClass(data: LoyaltyClassData) {
  return {
    id: `${GOOGLE_WALLET_ISSUER_ID}.${data.programId}`,
    issuerName: data.merchantName,
    programName: data.programName,
    reviewStatus: "UNDER_REVIEW",
    hexBackgroundColor: data.bgColor,
    programLogo: data.logoUrl
      ? {
          sourceUri: { uri: data.logoUrl },
          contentDescription: {
            defaultValue: { language: "fr", value: data.programName },
          },
        }
      : undefined,
    heroImage: data.heroImageUrl
      ? {
          sourceUri: { uri: data.heroImageUrl },
          contentDescription: {
            defaultValue: { language: "fr", value: data.programName },
          },
        }
      : undefined,
  };
}

/**
 * Crée un objet de carte de fidélité Google Wallet
 * (un objet par client)
 */
export function buildLoyaltyObject(data: LoyaltyObjectData) {
  const object: Record<string, unknown> = {
    id: `${GOOGLE_WALLET_ISSUER_ID}.${data.serialNumber}`,
    classId: data.classId,
    state: "ACTIVE",
    accountId: data.serialNumber,
    accountName: data.clientName,
    barcode: {
      type: "QR_CODE",
      value: data.serialNumber,
    },
  };

  if (data.programType === "STAMPS" || data.programType === "HYBRID") {
    object.loyaltyPoints = {
      label: "Tampons",
      balance: {
        int: data.currentStamps,
      },
    };
  } else if (data.programType === "POINTS") {
    object.loyaltyPoints = {
      label: "Points",
      balance: {
        int: Math.floor(data.currentPoints),
      },
    };
  }

  return object;
}

/**
 * Génère un lien "Save to Google Wallet" via un JWT signé
 */
export async function generateGoogleWalletLink(
  cardId: string
): Promise<string | null> {
  if (!GOOGLE_WALLET_SERVICE_ACCOUNT_KEY || !GOOGLE_WALLET_ISSUER_ID) {
    return null;
  }

  const card = await prisma.loyaltyCard.findUnique({
    where: { id: cardId },
    include: {
      client: true,
      program: {
        include: { merchant: true },
      },
    },
  });

  if (!card) return null;

  const config = card.program.config as Record<string, unknown>;
  const design = card.program.cardDesign as Record<string, unknown>;
  const template = getTemplate(card.program.templateId);

  const classId = `${GOOGLE_WALLET_ISSUER_ID}.${card.program.id}`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const logoUrl = card.program.logoBlobKey
    ? `${appUrl}/api/blob/${card.program.logoBlobKey}`
    : undefined;
  const heroImageUrl = card.program.stripBlobKey
    ? `${appUrl}/api/blob/${card.program.stripBlobKey}`
    : undefined;

  const loyaltyClass = buildLoyaltyClass({
    programId: card.program.id,
    programName: card.program.name,
    merchantName: card.program.merchant.name || "Commerce",
    bgColor:
      (design.bgColor as string) || template.bgColor || "#1a1a2e",
    logoUrl,
    heroImageUrl,
  });

  const loyaltyObject = buildLoyaltyObject({
    serialNumber: card.serialNumber,
    classId,
    clientName: card.client.firstName,
    currentStamps: card.currentStamps,
    maxStamps: (config.maxStamps as number) || 10,
    currentPoints: card.currentPoints,
    programType: card.program.type,
  });

  if (isBackFieldArray(card.program.backFields)) {
    loyaltyObject.textModulesData = card.program.backFields.map((f) => ({
      id: slugify(f.label),
      header: f.label,
      body: f.value,
    }));
  }

  // Créer le JWT
  const claims = {
    iss: GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL,
    aud: "google",
    origins: [process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"],
    typ: "savetowallet",
    payload: {
      loyaltyClasses: [loyaltyClass],
      loyaltyObjects: [loyaltyObject],
    },
  };

  const token = jwt.sign(claims, GOOGLE_WALLET_SERVICE_ACCOUNT_KEY, {
    algorithm: "RS256",
  });

  return `https://pay.google.com/gp/v/save/${token}`;
}

/**
 * Met à jour un objet Google Wallet existant via l'API REST
 */
export async function updateGoogleWalletObject(
  serialNumber: string
): Promise<boolean> {
  if (!GOOGLE_WALLET_SERVICE_ACCOUNT_KEY || !GOOGLE_WALLET_ISSUER_ID) {
    return false;
  }

  const card = await prisma.loyaltyCard.findUnique({
    where: { serialNumber },
    include: {
      client: true,
      program: true,
    },
  });

  if (!card) return false;

  const config = card.program.config as Record<string, unknown>;
  const objectId = `${GOOGLE_WALLET_ISSUER_ID}.${serialNumber}`;

  const updatedObject = buildLoyaltyObject({
    serialNumber,
    classId: `${GOOGLE_WALLET_ISSUER_ID}.${card.program.id}`,
    clientName: card.client.firstName,
    currentStamps: card.currentStamps,
    maxStamps: (config.maxStamps as number) || 10,
    currentPoints: card.currentPoints,
    programType: card.program.type,
  });

  try {
    // Obtenir un access token via le service account
    const accessToken = await getGoogleAccessToken();
    if (!accessToken) return false;

    const res = await fetch(
      `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${objectId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedObject),
      }
    );

    return res.ok;
  } catch (error) {
    console.error("Google Wallet update error:", error);
    return false;
  }
}

async function getGoogleAccessToken(): Promise<string | null> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const token = jwt.sign(
      {
        iss: GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL,
        scope: "https://www.googleapis.com/auth/wallet_object.issuer",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      },
      GOOGLE_WALLET_SERVICE_ACCOUNT_KEY,
      { algorithm: "RS256" }
    );

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${token}`,
    });

    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

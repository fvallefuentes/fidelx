/**
 * Apple Wallet Pass Generation
 *
 * Génère des fichiers .pkpass signés pour Apple Wallet.
 * Nécessite un compte Apple Developer ($99/an) et un certificat Pass Type ID.
 *
 * En mode développement, on génère un pass "mock" pour tester le flow.
 * En production, utilise passkit-generator pour signer les passes.
 */

import { prisma } from "@/lib/prisma";

interface PassData {
  serialNumber: string;
  programName: string;
  merchantName: string;
  clientName: string;
  currentStamps: number;
  maxStamps: number;
  currentPoints: number;
  bgColor: string;
  textColor: string;
  description: string;
  lastMessage?: string | null;
  locations?: { latitude: number; longitude: number; relevantText?: string }[];
}

export async function generateApplePass(cardId: string): Promise<Buffer | null> {
  const card = await prisma.loyaltyCard.findUnique({
    where: { id: cardId },
    include: {
      client: true,
      program: {
        include: {
          merchant: true,
          establishment: true,
        },
      },
    },
  });

  if (!card) return null;

  const config = card.program.config as Record<string, unknown>;
  const design = card.program.cardDesign as Record<string, unknown>;

  const passData: PassData = {
    serialNumber: card.serialNumber,
    programName: card.program.name,
    merchantName: card.program.merchant.name || "Commerce",
    clientName: card.client.firstName,
    currentStamps: card.currentStamps,
    maxStamps: (config.maxStamps as number) || 10,
    currentPoints: card.currentPoints,
    bgColor: (design.bgColor as string) || "#1a1a2e",
    textColor: (design.textColor as string) || "#ffffff",
    description: (design.description as string) || card.program.name,
    lastMessage: card.lastMessage,
    locations: card.program.establishment
      ? [
          {
            latitude: card.program.establishment.latitude || 0,
            longitude: card.program.establishment.longitude || 0,
            relevantText: `Vous êtes près de ${card.program.establishment.name} !`,
          },
        ]
      : undefined,
  };

  // En production, utiliser passkit-generator avec les vrais certificats
  if (
    process.env.APPLE_PASS_TYPE_ID &&
    process.env.APPLE_SIGNER_CERT_PATH &&
    process.env.APPLE_SIGNER_KEY_PATH &&
    process.env.APPLE_WWDR_CERT_PATH
  ) {
    return generateSignedPass(passData);
  }

  // Mode dev: retourner les données du pass en JSON (pour debug)
  return Buffer.from(JSON.stringify(passData, null, 2));
}

async function generateSignedPass(passData: PassData): Promise<Buffer> {
  // Import dynamique pour éviter l'erreur si les certs ne sont pas configurés
  const { PKPass } = await import("passkit-generator");
  const fs = await import("fs");
  const path = await import("path");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const passProps: any = {
    formatVersion: 1,
    serialNumber: passData.serialNumber,
    passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID!,
    teamIdentifier: process.env.APPLE_TEAM_ID!,
    organizationName: passData.merchantName,
    description: passData.description,
    backgroundColor: passData.bgColor,
    foregroundColor: passData.textColor,
    labelColor: passData.textColor,
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: passData.serialNumber,
        messageEncoding: "iso-8859-1",
      },
    ],
    locations: passData.locations?.filter((l) => l.latitude !== 0) || [],
    webServiceURL: `${process.env.NEXT_PUBLIC_APP_URL}/api/wallet/apple`,
    authenticationToken: passData.serialNumber,
  };

  const pass = new PKPass(
    {},
    {
      wwdr: fs.readFileSync(process.env.APPLE_WWDR_CERT_PATH!),
      signerCert: fs.readFileSync(process.env.APPLE_SIGNER_CERT_PATH!),
      signerKey: fs.readFileSync(process.env.APPLE_SIGNER_KEY_PATH!),
      signerKeyPassphrase: process.env.APPLE_SIGNER_KEY_PASSPHRASE || undefined,
    },
    passProps
  );

  // Type de pass: Store Card (carte de fidélité)
  pass.type = "storeCard";

  // Champs principaux
  pass.primaryFields.push({
    key: "stamps",
    label: passData.maxStamps ? "TAMPONS" : "POINTS",
    value: passData.maxStamps
      ? `${passData.currentStamps}/${passData.maxStamps}`
      : `${passData.currentPoints}`,
    changeMessage: passData.maxStamps
      ? "Vous avez maintenant %@ tampons !"
      : "Vous avez maintenant %@ points !",
  });

  // Champs secondaires
  pass.secondaryFields.push({
    key: "client",
    label: "CLIENT",
    value: passData.clientName,
  });

  // Champs auxiliaires
  pass.auxiliaryFields.push({
    key: "program",
    label: "PROGRAMME",
    value: passData.programName,
  });

  // Champs verso
  pass.backFields.push(
    {
      key: "merchant",
      label: "Commerce",
      value: passData.merchantName,
    },
    // Dernière offre — la valeur change à chaque campagne, et le
    // changeMessage déclenche une notification iOS lors du refresh
    {
      key: "lastMessage",
      label: "Dernière offre",
      value: passData.lastMessage || "Aucune offre récente",
      changeMessage: "%@",
    },
    {
      key: "info",
      label: "Information",
      value: "Carte de fidélité digitale propulsée par Fidlify",
    },
    {
      key: "privacy",
      label: "Confidentialité",
      value:
        "Vos données sont hébergées en Suisse et traitées conformément à la LPD. Vous pouvez demander la suppression de vos données à tout moment.",
    }
  );

  // Ajouter le logo si disponible
  const logoPath = path.join(process.cwd(), "public", "wallet-assets", "logo.png");
  if (fs.existsSync(logoPath)) {
    pass.addBuffer("logo.png", fs.readFileSync(logoPath));
    pass.addBuffer("logo@2x.png", fs.readFileSync(logoPath));
  }

  const iconPath = path.join(process.cwd(), "public", "wallet-assets", "icon.png");
  if (fs.existsSync(iconPath)) {
    pass.addBuffer("icon.png", fs.readFileSync(iconPath));
    pass.addBuffer("icon@2x.png", fs.readFileSync(iconPath));
  }

  return pass.getAsBuffer();
}

/**
 * Apple Wallet Web Service endpoints
 * Requis pour les notifications push et mises à jour
 *
 * POST /api/wallet/apple/v1/devices/{deviceLibraryId}/registrations/{passTypeId}/{serialNumber}
 * DELETE /api/wallet/apple/v1/devices/{deviceLibraryId}/registrations/{passTypeId}/{serialNumber}
 * GET /api/wallet/apple/v1/devices/{deviceLibraryId}/registrations/{passTypeId}
 * GET /api/wallet/apple/v1/passes/{passTypeId}/{serialNumber}
 * POST /api/wallet/apple/v1/log
 */
export async function registerDevice(
  deviceLibraryId: string,
  pushToken: string,
  serialNumber: string
) {
  const card = await prisma.loyaltyCard.findUnique({
    where: { serialNumber },
  });

  if (!card) return false;

  await prisma.passRegistration.upsert({
    where: {
      cardId_deviceLibraryId: {
        cardId: card.id,
        deviceLibraryId,
      },
    },
    update: { pushToken },
    create: {
      cardId: card.id,
      deviceLibraryId,
      pushToken,
      platform: "APPLE",
    },
  });

  return true;
}

export async function unregisterDevice(
  deviceLibraryId: string,
  serialNumber: string
) {
  const card = await prisma.loyaltyCard.findUnique({
    where: { serialNumber },
  });

  if (!card) return false;

  await prisma.passRegistration.deleteMany({
    where: {
      cardId: card.id,
      deviceLibraryId,
    },
  });

  return true;
}

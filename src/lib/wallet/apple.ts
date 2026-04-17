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
import { getBlob } from "@/lib/blob-store";
import fs from "fs";
import path from "path";

interface ProgramAssets {
  logoBlobKey: string | null;
  stripBlobKey: string | null;
  iconBlobKey: string | null;
  backFields: unknown;
}

interface BackField {
  label: string;
  value: string;
}

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

  const programAssets: ProgramAssets = {
    logoBlobKey: card.program.logoBlobKey ?? null,
    stripBlobKey: card.program.stripBlobKey ?? null,
    iconBlobKey: card.program.iconBlobKey ?? null,
    backFields: card.program.backFields ?? null,
  };

  // En production, utiliser passkit-generator avec les vrais certificats
  if (process.env.APPLE_PASS_TYPE_ID) {
    return generateSignedPass(passData, programAssets);
  }

  // Mode dev: retourner les données du pass en JSON (pour debug)
  return Buffer.from(JSON.stringify(passData, null, 2));
}

function parseBackFields(raw: unknown): BackField[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: BackField[] = [];
  for (const item of raw) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as { label?: unknown }).label === "string" &&
      typeof (item as { value?: unknown }).value === "string"
    ) {
      const it = item as { label: string; value: string };
      out.push({ label: it.label, value: it.value });
    }
  }
  return out.length > 0 ? out : null;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
}

async function tryReadLocalAsset(relPath: string): Promise<Buffer | null> {
  try {
    const full = path.join(process.cwd(), "public", "wallet-assets", relPath);
    if (fs.existsSync(full)) {
      return await fs.promises.readFile(full);
    }
  } catch {
    // ignore
  }
  return null;
}

async function generateSignedPass(
  passData: PassData,
  program: ProgramAssets
): Promise<Buffer> {
  const { PKPass } = await import("passkit-generator");

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
    authenticationToken: passData.serialNumber.replace(/-/g, "") + "0000",
  };

  const { APPLE_CERTS } = await import("./certs");

  const pass = new PKPass(
    {},
    {
      wwdr: APPLE_CERTS.wwdr,
      signerCert: APPLE_CERTS.signerCert,
      signerKey: APPLE_CERTS.signerKey,
      signerKeyPassphrase: process.env.APPLE_SIGNER_KEY_PASSPHRASE,
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

  // Champs verso — dynamiques via program.backFields, fallback sur les défauts
  const customBackFields = parseBackFields(program.backFields);
  if (customBackFields) {
    const usedKeys = new Set<string>();
    customBackFields.forEach((bf, i) => {
      let key = slugify(bf.label) || `back_${i}`;
      if (usedKeys.has(key)) key = `${key}_${i}`;
      usedKeys.add(key);
      pass.backFields.push({
        key,
        label: bf.label,
        value: bf.value,
      });
    });
  } else {
    pass.backFields.push(
      {
        key: "merchant",
        label: "Commerce",
        value: passData.merchantName,
      },
      {
        key: "info",
        label: "Information",
        value: "Carte de fidélité digitale propulsée par FidelX",
      },
      {
        key: "privacy",
        label: "Confidentialité",
        value:
          "Vos données sont hébergées en Suisse et traitées conformément à la LPD. Vous pouvez demander la suppression de vos données à tout moment.",
      }
    );
  }

  // Logo : blob uploadé → fichier local → rien
  let logoBuf: Buffer | null = null;
  if (program.logoBlobKey) {
    logoBuf = await getBlob(program.logoBlobKey);
  }
  if (!logoBuf) {
    logoBuf = await tryReadLocalAsset("logo.png");
  }
  if (logoBuf) {
    pass.addBuffer("logo.png", logoBuf);
    pass.addBuffer("logo@2x.png", logoBuf);
  }

  // Strip : blob uploadé → rien
  if (program.stripBlobKey) {
    const stripBuf = await getBlob(program.stripBlobKey);
    if (stripBuf) {
      pass.addBuffer("strip.png", stripBuf);
      pass.addBuffer("strip@2x.png", stripBuf);
    }
  }

  // Icon : blob uploadé → fichier local → défauts inlined (base64)
  let iconBuf: Buffer | null = null;
  if (program.iconBlobKey) {
    iconBuf = await getBlob(program.iconBlobKey);
  }
  if (!iconBuf) {
    iconBuf = await tryReadLocalAsset("icon.png");
  }
  if (iconBuf) {
    pass.addBuffer("icon.png", iconBuf);
    pass.addBuffer("icon@2x.png", iconBuf);
    pass.addBuffer("icon@3x.png", iconBuf);
  } else {
    const { DEFAULT_ICON_29, DEFAULT_ICON_58, DEFAULT_ICON_87 } = await import(
      "./certs"
    );
    pass.addBuffer("icon.png", DEFAULT_ICON_29);
    pass.addBuffer("icon@2x.png", DEFAULT_ICON_58);
    pass.addBuffer("icon@3x.png", DEFAULT_ICON_87);
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

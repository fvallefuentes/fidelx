/**
 * Apple Wallet Pass Generation
 *
 * Génère des fichiers .pkpass signés pour Apple Wallet.
 * Nécessite un compte Apple Developer ($99/an) et un certificat Pass Type ID.
 *
 * En mode développement, on génère un pass "mock" pour tester le flow.
 * En production, utilise passkit-generator avec les certs inline (certs.ts).
 */

import { prisma } from "@/lib/prisma";

/**
 * Décode une data URL "data:image/...;base64,XXX" en Buffer,
 * ou null si la chaîne est invalide.
 */
function decodeDataUrl(dataUrl: string): Buffer | null {
  const m = dataUrl.match(/^data:image\/[\w+.-]+;base64,(.+)$/);
  if (!m) return null;
  try {
    return Buffer.from(m[1], "base64");
  } catch {
    return null;
  }
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
  lastMessage?: string | null;
  logoData?: string | null; // data URL "data:image/png;base64,..."
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
    logoData: (design.logoData as string) || null,
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

  // En production, utiliser passkit-generator avec les certs inlinés
  if (process.env.APPLE_PASS_TYPE_ID) {
    return generateSignedPass(passData);
  }

  // Mode dev: retourner les données du pass en JSON (pour debug)
  return Buffer.from(JSON.stringify(passData, null, 2));
}

async function generateSignedPass(passData: PassData): Promise<Buffer> {
  const { PKPass } = await import("passkit-generator");
  const { APPLE_CERTS, DEFAULT_ICON_29, DEFAULT_ICON_58, DEFAULT_ICON_87 } =
    await import("./certs");
  const { generateStripImage } = await import("./stripImage");

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
    // barcodes set via pass.setBarcodes() below — passkit-generator
    // ne les prend pas toujours via passProps
    locations: passData.locations?.filter((l) => l.latitude !== 0) || [],
    webServiceURL: `${process.env.NEXT_PUBLIC_APP_URL}/api/wallet/apple`,
    authenticationToken: passData.serialNumber.replace(/-/g, "") + "0000",
  };

  // Empty string passphrase → undefined (sinon node-forge throw
  // "Length must be at least 16 characters long")
  const passphrase = process.env.APPLE_SIGNER_KEY_PASSPHRASE;
  const signerKeyPassphrase = passphrase && passphrase.length > 0 ? passphrase : undefined;

  const pass = new PKPass(
    {},
    {
      wwdr: APPLE_CERTS.wwdr,
      signerCert: APPLE_CERTS.signerCert,
      signerKey: APPLE_CERTS.signerKey,
      signerKeyPassphrase,
    },
    passProps
  );

  // Type de pass: storeCard — c'est le seul (avec coupon) qui supporte
  // un strip image visible côté iOS. generic et eventTicket ne l'affichent
  // pas. storeCard limite à 1 primary field, donc on met PROGRAMME en
  // secondaryField (qui rend à droite sous le strip).
  pass.type = "storeCard";

  // QR code en bas avec serial visible — setBarcodes() est la vraie API
  // de passkit-generator (les passProps.barcodes ne suffisent pas)
  pass.setBarcodes({
    format: "PKBarcodeFormatQR",
    message: passData.serialNumber,
    messageEncoding: "iso-8859-1",
    altText: passData.serialNumber,
  });

  // Sous le strip : 2 secondary fields côte à côte (gauche + droite)
  // — pas de primary qui s'afficherait en gros et écraserait le strip
  if (passData.maxStamps) {
    pass.secondaryFields.push({
      key: "stamps_required",
      label: "TAMPONS REQUIS POUR LA RÉCOMPENSE",
      value: `${passData.maxStamps}`,
    });
    pass.secondaryFields.push({
      key: "program",
      label: "PROGRAMME",
      value: passData.programName,
      textAlignment: "PKTextAlignmentRight",
    });
  } else {
    pass.secondaryFields.push({
      key: "points",
      label: "POINTS",
      value: `${passData.currentPoints}`,
      changeMessage: "Vous avez maintenant %@ points !",
    });
    pass.secondaryFields.push({
      key: "program",
      label: "PROGRAMME",
      value: passData.programName,
      textAlignment: "PKTextAlignmentRight",
    });
  }

  // Champ offre — header top-right, mis à jour par les campagnes,
  // le changeMessage déclenche la notif iOS au refresh
  pass.headerFields.push({
    key: "offer",
    label: "OFFRE",
    value: passData.lastMessage || "",
    changeMessage: "%@",
  });

  // Champs verso
  pass.backFields.push(
    {
      key: "merchant",
      label: "Commerce",
      value: passData.merchantName,
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

  // Icônes par défaut bundlées (Apple Wallet rejette les passes sans icon.png)
  pass.addBuffer("icon.png", DEFAULT_ICON_29);
  pass.addBuffer("icon@2x.png", DEFAULT_ICON_58);
  pass.addBuffer("icon@3x.png", DEFAULT_ICON_87);

  // Logo personnalisé du commerce (haut-gauche du pass) si fourni
  if (passData.logoData) {
    try {
      const logoBuf = decodeDataUrl(passData.logoData);
      if (logoBuf) {
        // Sharp resize aux 3 résolutions Apple recommande pour logo.png
        // (160x50 @1x, 320x100 @2x, 480x150 @3x). On contraint la hauteur
        // et on laisse la largeur s'adapter — Apple crop si trop large.
        const sharp = (await import("sharp")).default;
        const buf1x = await sharp(logoBuf).resize({ height: 50, fit: "inside", withoutEnlargement: true }).png().toBuffer();
        const buf2x = await sharp(logoBuf).resize({ height: 100, fit: "inside", withoutEnlargement: true }).png().toBuffer();
        const buf3x = await sharp(logoBuf).resize({ height: 150, fit: "inside", withoutEnlargement: true }).png().toBuffer();
        pass.addBuffer("logo.png", buf1x);
        pass.addBuffer("logo@2x.png", buf2x);
        pass.addBuffer("logo@3x.png", buf3x);
      }
    } catch (err) {
      console.error("[apple] logo decode/resize failed:", err);
    }
  }

  // Strip image — pastilles de tampons générées dynamiquement
  if (passData.maxStamps && passData.maxStamps > 0) {
    try {
      const stripBuf = await generateStripImage({
        currentStamps: passData.currentStamps,
        maxStamps: passData.maxStamps,
        bgColor: passData.bgColor,
      });
      pass.addBuffer("strip.png", stripBuf);
      pass.addBuffer("strip@2x.png", stripBuf);
      pass.addBuffer("strip@3x.png", stripBuf);
    } catch (err) {
      console.error("[apple] strip generation failed:", err);
    }
  }

  return pass.getAsBuffer();
}

/**
 * Apple Wallet Web Service endpoints
 * Requis pour les notifications push et mises à jour
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

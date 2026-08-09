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
import { resolveVisibleCardOffer } from "@/lib/card-offers";

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

function isBgDark(hex: string): boolean {
  const m = hex.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return true;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}

function hasValidLocation(location?: {
  latitude: number | null;
  longitude: number | null;
} | null): location is { latitude: number; longitude: number; name?: string } {
  return (
    typeof location?.latitude === "number" &&
    typeof location.longitude === "number" &&
    location.latitude >= -90 &&
    location.latitude <= 90 &&
    location.longitude >= -180 &&
    location.longitude <= 180
  );
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
  stampColor?: string;
  stampCheckColor?: string;
  stampEmptyColor?: string;
  stampIcon?: string;
  stampSpacing?: string;
  stampAreaInset?: number;
  stampAreaRadius?: number;
  stampBgType?: "none" | "color" | "image";
  stampBgColor?: string;
  stampBgColor2?: string;
  stampBgImage?: string | null;
  labelColor?: string;
  description: string;
  lastMessage?: string | null;
  notificationMessage?: string | null;
  logoData?: string | null; // data URL "data:image/png;base64,..."
  notificationIconData?: string | null;
  heroImage?: string | null; // data URL — pour POINTS, remplace le strip à pastilles
  programType?: string;
  pointsTarget?: number; // pour POINTS : seuil pour la récompense
  showFidlifyBranding?: boolean;
  /** Marque le pass comme expiré → iOS le déplace dans la section "Expirés"
   *  du Wallet et le grise. Branché sur card.status (EXPIRED ou REVOKED). */
  voided?: boolean;
  locations?: { latitude: number; longitude: number; relevantText?: string }[];
}

export async function generateApplePass(cardId: string): Promise<Buffer | null> {
  const card = await prisma.loyaltyCard.findUnique({
    where: { id: cardId },
    include: {
      client: true,
      program: {
        include: {
          merchant: {
            select: {
              id: true,
              name: true,
              plan: true,
              testMode: true,
              notificationDefaultLogo: true,
            },
          },
          establishment: true,
        },
      },
    },
  });

  if (!card) return null;

  const config = card.program.config as Record<string, unknown>;
  const design = card.program.cardDesign as Record<string, unknown>;

  const proximityMessage =
    typeof design.proximityMessage === "string" && design.proximityMessage.trim()
      ? design.proximityMessage.trim()
      : hasValidLocation(card.program.establishment)
        ? `Vous êtes près de ${card.program.establishment.name} !`
        : undefined;

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
    stampColor: (design.stampColor as string) || undefined,
    stampCheckColor: (design.stampCheckColor as string) || undefined,
    stampEmptyColor: (design.stampEmptyColor as string) || undefined,
    stampIcon: (design.stampIcon as string) || undefined,
    stampSpacing: (design.stampSpacing as string) || undefined,
    stampAreaInset:
      typeof design.stampAreaInset === "number"
        ? design.stampAreaInset
        : undefined,
    stampAreaRadius:
      typeof design.stampAreaRadius === "number"
        ? design.stampAreaRadius
        : undefined,
    stampBgType: (design.stampBgType as "none" | "color" | "image") || undefined,
    stampBgColor: (design.stampBgColor as string) || undefined,
    stampBgColor2: (design.stampBgColor2 as string) || undefined,
    stampBgImage: (design.stampBgImage as string) || null,
    labelColor: (design.labelColor as string) || undefined,
    description: (design.description as string) || card.program.name,
    lastMessage: resolveVisibleCardOffer({
      program: card.program,
      lastMessage: card.lastMessage,
      lastMessageExpiresAt: card.lastMessageExpiresAt,
    }),
    notificationMessage: card.lastMessage,
    // Le logo de la carte vient TOUJOURS du programme. Le logo
    // d'une campagne ne sert qu'à l'aperçu côté merchant — iOS
    // utilise toujours sa propre icône Wallet pour les notifications.
    logoData: (design.logoData as string) || null,
    notificationIconData: card.program.merchant.notificationDefaultLogo || null,
    heroImage: (design.heroImage as string) || null,
    programType: card.program.type,
    pointsTarget:
      ((config.tiers as { points?: number }[] | undefined)?.[0]?.points) ||
      undefined,
    showFidlifyBranding:
      !card.program.merchant.testMode &&
      (card.program.merchant.plan || "FREE") === "FREE",
    voided:
      (card.status as string) === "EXPIRED" ||
      (card.status as string) === "REVOKED",
    locations: hasValidLocation(card.program.establishment)
      ? [
          {
            latitude: card.program.establishment.latitude,
            longitude: card.program.establishment.longitude,
            relevantText: proximityMessage,
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
    labelColor: passData.labelColor || passData.textColor,
    // barcodes set via pass.setBarcodes() below — passkit-generator
    // ne les prend pas toujours via passProps
    webServiceURL: `${process.env.NEXT_PUBLIC_APP_URL}/api/wallet/apple`,
    authenticationToken: passData.serialNumber.replace(/-/g, "") + "0000",
    // voided : iOS déplace le pass dans la section "Expirés" du Wallet et le grise.
    // À la prochaine notif push, le device refetch le pass et voit voided=true.
    ...(passData.voided ? { voided: true } : {}),
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

  // passkit-generator exclut volontairement `locations` des propriétés du
  // constructeur : les ajouter à passProps ne les écrivait donc jamais dans
  // pass.json. L'API dédiée est obligatoire pour activer la pertinence
  // géographique et le message affiché sur l'écran verrouillé.
  if (passData.locations?.length) {
    pass.setLocations(...passData.locations);
  }

  // Type de pass: storeCard — c'est le seul (avec coupon) qui supporte
  // un strip image visible côté iOS. generic et eventTicket ne l'affichent
  // pas. Le programme reste compact dans le header et l'offre profite de la
  // zone secondaire, plus large, sous le strip.
  pass.type = "storeCard";

  // QR code en bas avec serial visible — setBarcodes() est la vraie API
  // de passkit-generator (les passProps.barcodes ne suffisent pas)
  pass.setBarcodes({
    format: "PKBarcodeFormatQR",
    message: passData.serialNumber,
    messageEncoding: "iso-8859-1",
    altText: passData.serialNumber,
  });

  // Sous le strip : progression à gauche, offre active à droite.
  // Les notifications utilisent un champ séparé au verso afin qu'une
  // actualité ponctuelle ne remplace pas l'offre temporaire du programme.
  const isPointsProgram = passData.programType === "POINTS";
  if (isPointsProgram) {
    pass.secondaryFields.push({
      key: "points",
      label: "POINTS",
      value: passData.pointsTarget
        ? `${passData.currentPoints} / ${passData.pointsTarget}`
        : `${passData.currentPoints}`,
      changeMessage: "Vous avez maintenant %@ points !",
    });
  } else {
    pass.secondaryFields.push({
      key: "stamps_required",
      label: "TAMPONS REQUIS",
      value: `${passData.maxStamps}`,
    });
  }

  pass.secondaryFields.push({
    key: "offer",
    label: "OFFRE",
    value: passData.lastMessage || "",
    textAlignment: "PKTextAlignmentRight",
  });

  // Le nom du programme est plus stable et plus court que le texte d'une
  // offre : il convient mieux à la petite zone en haut à droite.
  pass.headerFields.push({
    key: "program",
    label: "PROGRAMME",
    value: passData.programName,
    textAlignment: "PKTextAlignmentRight",
  });

  // Champs verso

  pass.backFields.push({
    key: "merchant",
    label: "Commerce",
    value: passData.merchantName,
  });

  pass.backFields.push({
    key: "notification_message",
    label: "Dernière notification",
    value: passData.notificationMessage || "",
    ...(passData.notificationMessage ? { changeMessage: "%@" } : {}),
  });

  pass.backFields.push({
    key: "privacy",
    label: "Confidentialité",
    value:
      "Vos données sont hébergées en Suisse et traitées conformément à la LPD. Vous pouvez demander la suppression de vos données à tout moment.",
  });

  // Logo haut-gauche du pass + icône notifications.
  // Le réglage Notifications Wallet est prioritaire, avec fallback Fidlify.
  let iconAdded = false;
  {
    const sharp = (await import("sharp")).default;
    const { readFileSync } = await import("fs");
    const { join } = await import("path");

    // Détermine le buffer source du logo
    let logoBuf: Buffer | null = null;
    if (!passData.logoData && passData.showFidlifyBranding) {
      const dark = isBgDark(passData.bgColor);
      const logoFile = dark ? "fidlify_logo_white.png" : "fidlify_logo_black.svg";
      logoBuf = readFileSync(join(process.cwd(), `src/lib/wallet/${logoFile}`));
    } else if (passData.logoData) {
      logoBuf = decodeDataUrl(passData.logoData);
    }

    // Fallback : sans logo perso (ou logoData invalide) →
    // on affiche quand même le logo Fidlify pour que l'emplacement haut-gauche
    // du pass ne reste pas vide.
    if (!logoBuf) {
      const dark = isBgDark(passData.bgColor);
      const logoFile = dark ? "fidlify_logo_white.png" : "fidlify_logo_black.svg";
      logoBuf = readFileSync(join(process.cwd(), `src/lib/wallet/${logoFile}`));
    }

    if (logoBuf) {
      try {
        const logo1x = await sharp(logoBuf).resize({ height: 50, fit: "inside", withoutEnlargement: true }).png().toBuffer();
        const logo2x = await sharp(logoBuf).resize({ height: 100, fit: "inside", withoutEnlargement: true }).png().toBuffer();
        const logo3x = await sharp(logoBuf).resize({ height: 150, fit: "inside", withoutEnlargement: true }).png().toBuffer();
        pass.addBuffer("logo.png", logo1x);
        pass.addBuffer("logo@2x.png", logo2x);
        pass.addBuffer("logo@3x.png", logo3x);
      } catch (err) {
        console.error("[apple] logo resize failed:", err);
      }
    }

    const iconBuf = passData.notificationIconData
      ? decodeDataUrl(passData.notificationIconData) || logoBuf
      : logoBuf;

    if (iconBuf) {
      try {
        const icon1x = await sharp(iconBuf).resize(29, 29, { fit: "cover", position: "center" }).png().toBuffer();
        const icon2x = await sharp(iconBuf).resize(58, 58, { fit: "cover", position: "center" }).png().toBuffer();
        const icon3x = await sharp(iconBuf).resize(87, 87, { fit: "cover", position: "center" }).png().toBuffer();
        pass.addBuffer("icon.png", icon1x);
        pass.addBuffer("icon@2x.png", icon2x);
        pass.addBuffer("icon@3x.png", icon3x);
        iconAdded = true;
      } catch (err) {
        console.error("[apple] icon resize failed:", err);
      }
    }
  }

  // Fallback : icônes Fidlify par défaut (Apple rejette les passes sans icon.png)
  if (!iconAdded) {
    pass.addBuffer("icon.png", DEFAULT_ICON_29);
    pass.addBuffer("icon@2x.png", DEFAULT_ICON_58);
    pass.addBuffer("icon@3x.png", DEFAULT_ICON_87);
  }

  // Strip image — POINTS avec heroImage : on l'utilise telle quelle.
  // Sinon (STAMPS, ou POINTS sans heroImage) : pastilles dynamiques.
  if (passData.programType === "POINTS" && passData.heroImage) {
    try {
      const sharp = (await import("sharp")).default;
      const heroBuf = decodeDataUrl(passData.heroImage);
      if (heroBuf) {
        // Strip dimensions @3x = 1125x432, cover/center pour respecter le ratio
        const stripBuf = await sharp(heroBuf)
          .resize(1125, 432, { fit: "cover", position: "center" })
          .png()
          .toBuffer();
        pass.addBuffer("strip.png", stripBuf);
        pass.addBuffer("strip@2x.png", stripBuf);
        pass.addBuffer("strip@3x.png", stripBuf);
      }
    } catch (err) {
      console.error("[apple] hero strip generation failed:", err);
    }
  } else if (
    !isPointsProgram &&
    passData.maxStamps &&
    passData.maxStamps > 0
  ) {
    try {
      const stripBuf = await generateStripImage({
        currentStamps: passData.currentStamps,
        maxStamps: passData.maxStamps,
        bgColor: passData.bgColor,
        stampColor: passData.stampColor,
        stampCheckColor: passData.stampCheckColor,
        stampEmptyColor: passData.stampEmptyColor,
        stampIcon: passData.stampIcon,
        stampSpacing: passData.stampSpacing,
        stampAreaInset: passData.stampAreaInset,
        stampAreaRadius: passData.stampAreaRadius,
        stampBgType: passData.stampBgType,
        stampBgColor: passData.stampBgColor,
        stampBgColor2: passData.stampBgColor2,
        stampBgImage: passData.stampBgImage,
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

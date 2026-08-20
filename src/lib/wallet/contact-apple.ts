import { prisma } from "@/lib/prisma";

function decodeDataUrl(dataUrl?: string | null) {
  const match = dataUrl?.match(/^data:image\/[\w+.-]+;base64,(.+)$/);
  if (!match) return null;
  try {
    return Buffer.from(match[1], "base64");
  } catch {
    return null;
  }
}

export async function generateContactApplePass(slug: string) {
  const card = await prisma.contactCard.findUnique({ where: { slug } });
  if (!card || !card.isActive) return null;

  if (!process.env.APPLE_PASS_TYPE_ID) {
    return Buffer.from(JSON.stringify({
      type: "generic",
      serialNumber: `contact-${card.id}`,
      displayName: card.displayName,
      companyName: card.companyName,
      jobTitle: card.jobTitle,
      phone: card.phone,
      email: card.email,
      website: card.website,
    }, null, 2));
  }

  const { PKPass } = await import("passkit-generator");
  const sharp = (await import("sharp")).default;
  const { readFileSync } = await import("fs");
  const { join } = await import("path");
  const { APPLE_CERTS } = await import("./certs");

  const passphrase = process.env.APPLE_SIGNER_KEY_PASSPHRASE;
  const pass = new PKPass(
    {},
    {
      ...APPLE_CERTS,
      signerKeyPassphrase: passphrase?.length ? passphrase : undefined,
    },
    {
      formatVersion: 1,
      serialNumber: `contact-${card.id}`,
      passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID,
      teamIdentifier: process.env.APPLE_TEAM_ID!,
      organizationName: card.companyName,
      description: `Carte de contact de ${card.displayName}`,
      logoText: card.companyName,
      backgroundColor: card.bgColor,
      foregroundColor: card.textColor,
      labelColor: card.accentColor,
    }
  );

  pass.type = "generic";
  pass.headerFields.push({
    key: "company",
    label: "ENTREPRISE",
    value: card.companyName,
    textAlignment: "PKTextAlignmentRight",
  });
  pass.primaryFields.push({
    key: "name",
    label: card.jobTitle ? "CONTACT" : "CARTE DE CONTACT",
    value: card.displayName,
  });
  if (card.jobTitle) {
    pass.secondaryFields.push({ key: "role", label: "FONCTION", value: card.jobTitle });
  }
  if (card.phone) {
    pass.auxiliaryFields.push({ key: "phone", label: "TÉLÉPHONE", value: card.phone });
  }
  if (card.email) {
    pass.auxiliaryFields.push({ key: "email", label: "E-MAIL", value: card.email });
  }

  const backFields: Array<{ key: string; label: string; value: string }> = [];
  if (card.phone) backFields.push({ key: "phone_back", label: "Téléphone", value: card.phone });
  if (card.email) backFields.push({ key: "email_back", label: "E-mail", value: card.email });
  if (card.website) backFields.push({ key: "website", label: "Site internet", value: card.website });
  if (card.address) backFields.push({ key: "address", label: "Adresse", value: card.address });
  if (card.whatsapp) backFields.push({ key: "whatsapp", label: "WhatsApp", value: card.whatsapp });
  if (card.bookingUrl) backFields.push({ key: "booking", label: "Prendre rendez-vous", value: card.bookingUrl });
  if (card.instagram) backFields.push({ key: "instagram", label: "Instagram", value: card.instagram });
  if (card.linkedin) backFields.push({ key: "linkedin", label: "LinkedIn", value: card.linkedin });
  pass.backFields.push(...backFields);

  const fallbackLogo = readFileSync(join(process.cwd(), "src/lib/wallet/fidlify_logo_black.svg"));
  const logoBuffer = decodeDataUrl(card.logoData) || fallbackLogo;
  const [logo1x, logo2x, logo3x] = await Promise.all([
    sharp(logoBuffer).resize({ height: 50, fit: "inside" }).png().toBuffer(),
    sharp(logoBuffer).resize({ height: 100, fit: "inside" }).png().toBuffer(),
    sharp(logoBuffer).resize({ height: 150, fit: "inside" }).png().toBuffer(),
  ]);
  pass.addBuffer("logo.png", logo1x);
  pass.addBuffer("logo@2x.png", logo2x);
  pass.addBuffer("logo@3x.png", logo3x);

  const renderIcon = async (size: number) => {
    const inset = Math.max(2, Math.round(size * 0.12));
    const foreground = await sharp(logoBuffer)
      .resize(size - inset * 2, size - inset * 2, { fit: "contain" })
      .png()
      .toBuffer();
    return sharp({
      create: { width: size, height: size, channels: 4, background: card.bgColor },
    })
      .composite([{ input: foreground, gravity: "center" }])
      .png()
      .toBuffer();
  };
  const [icon1x, icon2x, icon3x] = await Promise.all([
    renderIcon(29),
    renderIcon(58),
    renderIcon(87),
  ]);
  pass.addBuffer("icon.png", icon1x);
  pass.addBuffer("icon@2x.png", icon2x);
  pass.addBuffer("icon@3x.png", icon3x);

  if (card.photoData) {
    const photo = decodeDataUrl(card.photoData);
    if (photo) {
      const [thumb1x, thumb2x, thumb3x] = await Promise.all([
        sharp(photo).resize(90, 90, { fit: "cover" }).png().toBuffer(),
        sharp(photo).resize(180, 180, { fit: "cover" }).png().toBuffer(),
        sharp(photo).resize(270, 270, { fit: "cover" }).png().toBuffer(),
      ]);
      pass.addBuffer("thumbnail.png", thumb1x);
      pass.addBuffer("thumbnail@2x.png", thumb2x);
      pass.addBuffer("thumbnail@3x.png", thumb3x);
    }
  }

  return pass.getAsBuffer();
}

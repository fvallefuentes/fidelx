import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { digitsOnly, normalizeWebUrl } from "@/lib/contact-card";

const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID || "";
const serviceEmail = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL || "";
const serviceKey = (process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY || "").replace(/\\n/g, "\n");

export async function generateContactGoogleWalletLink(slug: string) {
  if (!issuerId || !serviceEmail || !serviceKey) return null;

  const card = await prisma.contactCard.findUnique({ where: { slug } });
  if (!card || !card.isActive) return null;

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const classId = `${issuerId}.contact_${card.id}`;
  const objectId = `${issuerId}.contact_${card.id}`;
  const logoUrl = `${appUrl}/api/contact-card/${card.slug}/logo?v=${card.updatedAt.getTime()}`;
  const links: Array<{ uri: string; description: string; id: string }> = [];
  if (card.phone) links.push({ uri: `tel:${card.phone}`, description: "Appeler", id: "phone" });
  if (card.email) links.push({ uri: `mailto:${card.email}`, description: "E-mail", id: "email" });
  if (card.website) links.push({ uri: normalizeWebUrl(card.website)!, description: "Site internet", id: "website" });
  if (card.address) links.push({ uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(card.address)}`, description: "Itinéraire", id: "directions" });
  if (card.whatsapp && digitsOnly(card.whatsapp)) links.push({ uri: `https://wa.me/${digitsOnly(card.whatsapp)}`, description: "WhatsApp", id: "whatsapp" });
  if (card.bookingUrl) links.push({ uri: normalizeWebUrl(card.bookingUrl)!, description: "Rendez-vous", id: "booking" });

  const textModulesData = [
    card.phone ? { id: "phone", header: "Téléphone", body: card.phone } : null,
    card.email ? { id: "email", header: "E-mail", body: card.email } : null,
    card.address ? { id: "address", header: "Adresse", body: card.address } : null,
  ].filter(Boolean);

  const genericClass = {
    id: classId,
    issuerName: card.companyName,
    reviewStatus: "UNDER_REVIEW",
  };
  const genericObject: Record<string, unknown> = {
    id: objectId,
    classId,
    state: "ACTIVE",
    cardTitle: { defaultValue: { language: "fr", value: card.companyName } },
    header: { defaultValue: { language: "fr", value: card.displayName } },
    subheader: card.jobTitle
      ? { defaultValue: { language: "fr", value: card.jobTitle } }
      : undefined,
    hexBackgroundColor: card.bgColor,
    logo: {
      sourceUri: { uri: logoUrl },
      contentDescription: { defaultValue: { language: "fr", value: card.companyName } },
    },
    textModulesData,
    linksModuleData: links.length ? { uris: links } : undefined,
    appLinkData: {
      webAppLinkInfo: { appTarget: { targetUri: { uri: `${appUrl}/contact/${card.slug}` } } },
      displayText: { defaultValue: { language: "fr", value: "Voir les coordonnées" } },
    },
  };

  if (card.photoData) {
    genericObject.heroImage = {
      sourceUri: { uri: `${appUrl}/api/contact-card/${card.slug}/photo?v=${card.updatedAt.getTime()}` },
      contentDescription: { defaultValue: { language: "fr", value: card.displayName } },
    };
  }

  const token = jwt.sign(
    {
      iss: serviceEmail,
      aud: "google",
      origins: [appUrl],
      typ: "savetowallet",
      payload: { genericClasses: [genericClass], genericObjects: [genericObject] },
    },
    serviceKey,
    { algorithm: "RS256" }
  );

  return `https://pay.google.com/gp/v/save/${token}`;
}

import { prisma } from "@/lib/prisma";
import type { ContactCardEventType } from "@/generated/prisma/client";

export function createContactCardSlug(name: string, merchantId: string) {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return `${base || "contact"}-${merchantId.slice(-10).toLowerCase()}`;
}

export function normalizeWebUrl(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function digitsOnly(value?: string | null) {
  return value?.replace(/[^\d]/g, "") || "";
}

export function contactCardPublicUrl(slug: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/contact/${slug}`;
}

export async function recordContactCardEvent(
  cardId: string,
  type: ContactCardEventType
) {
  try {
    await prisma.contactCardEvent.create({ data: { cardId, type } });
  } catch (error) {
    console.error("[contact-card] event tracking failed:", error);
  }
}

export function escapeVCard(value?: string | null) {
  return (value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

export function buildVCard(card: {
  displayName: string;
  companyName: string;
  jobTitle: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  whatsapp: string | null;
  bookingUrl: string | null;
}) {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCard(card.displayName)}`,
    `N:${escapeVCard(card.displayName)};;;;`,
    `ORG:${escapeVCard(card.companyName)}`,
  ];

  if (card.jobTitle) lines.push(`TITLE:${escapeVCard(card.jobTitle)}`);
  if (card.phone) lines.push(`TEL;TYPE=WORK,VOICE:${escapeVCard(card.phone)}`);
  if (card.email) lines.push(`EMAIL;TYPE=WORK:${escapeVCard(card.email)}`);
  if (card.website) lines.push(`URL:${escapeVCard(normalizeWebUrl(card.website))}`);
  if (card.address) lines.push(`ADR;TYPE=WORK:;;${escapeVCard(card.address)};;;;`);
  if (card.whatsapp) {
    const whatsappNumber = digitsOnly(card.whatsapp);
    if (whatsappNumber) lines.push(`X-SOCIALPROFILE;TYPE=whatsapp:https://wa.me/${whatsappNumber}`);
  }
  if (card.bookingUrl) {
    lines.push(`X-BOOKING-URL:${escapeVCard(normalizeWebUrl(card.bookingUrl))}`);
  }

  lines.push("END:VCARD");
  return `${lines.join("\r\n")}\r\n`;
}

/**
 * Parrainage B2B (merchant → merchant).
 *
 * Mécanique :
 *  - À l'inscription, un lien unique est créé pour chaque merchant
 *    (slug basé sur son nom commercial : "cafe-bellini-r2x9").
 *  - Le merchant partage `https://fidlify.com/r/{code}` à un confrère.
 *  - Au clic → cookie `fidlify_mref` posé pour 30 jours.
 *  - À l'inscription du filleul → `MerchantReferralAttribution(status: PENDING)`.
 *  - À la 1ère facture payée du filleul + 14j safety → CONFIRMED.
 *  - Crédit : 1 mois gratuit du plan du filleul, des deux côtés.
 *  - Cap parrain : max 12 mois cumulés (plafond `monthsEarnedTotal`).
 */
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import { createMerchantNotification } from "@/lib/notifications/merchant";

const MAX_MONTHS_CUMULATIVE = 12;
const SAFETY_WINDOW_DAYS = 14;

export const MERCHANT_REFERRAL_COOKIE = "fidlify_mref";
export const MERCHANT_REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

/* ============================================================
 * SLUG GENERATION
 * ============================================================ */

/**
 * Convertit un nom commercial en slug URL-safe.
 * "Café Bellini SA" → "cafe-bellini-sa"
 */
function slugifyName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40); // garde-fou longueur
}

/**
 * Génère un suffixe random 4 chars [a-z0-9] pour éviter les collisions
 * tout en restant lisible et mémorisable.
 */
function randomSuffix(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789"; // exclut i/l/0/1 (ambigus)
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/**
 * Génère un slug unique pour un merchant donné, en retry-ant si collision.
 * Fallback : si le nom est vide/imparseable, utilise "fid-" + suffix uniquement.
 */
export async function generateUniqueSlug(name: string | null): Promise<string> {
  const base = name ? slugifyName(name) : "";
  const prefix = base || "fid";

  // Jusqu'à 5 retries avant fallback long
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `${prefix}-${randomSuffix()}`;
    const existing = await prisma.merchantReferralLink.findUnique({
      where: { code: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  // Fallback rare : ajouter un timestamp court
  return `${prefix}-${Date.now().toString(36).slice(-6)}`;
}

/* ============================================================
 * LINK CREATION / RETRIEVAL
 * ============================================================ */

/**
 * Retourne le lien parrainage du merchant, le crée si absent (idempotent).
 * Appel safe depuis le dashboard ou un hook register.
 */
export async function getOrCreateMerchantReferralLink(merchantId: string) {
  const existing = await prisma.merchantReferralLink.findUnique({
    where: { merchantId },
  });
  if (existing) return existing;

  const user = await prisma.user.findUnique({
    where: { id: merchantId },
    select: { id: true, name: true, role: true },
  });
  if (!user) {
    throw new Error(`User ${merchantId} not found`);
  }
  // Le parrainage est réservé aux merchants (USER role), pas aux STAFF/ADMIN.
  if (user.role !== "USER") {
    throw new Error(`User ${merchantId} cannot create a referral link (role=${user.role})`);
  }

  const code = await generateUniqueSlug(user.name);

  // Race-safe : si un autre process a créé le lien entre findUnique et create,
  // on attrape l'erreur P2002 (unique constraint) et on relit.
  try {
    return await prisma.merchantReferralLink.create({
      data: { merchantId, code },
    });
  } catch (err) {
    const existingRetry = await prisma.merchantReferralLink.findUnique({
      where: { merchantId },
    });
    if (existingRetry) return existingRetry;
    throw err;
  }
}

/* ============================================================
 * CLICK TRACKING
 * ============================================================ */

/**
 * Increment atomique du compteur clicks.
 * Retourne le link s'il existe, null sinon.
 */
export async function trackReferralClick(code: string) {
  try {
    const link = await prisma.merchantReferralLink.update({
      where: { code },
      data: { clicks: { increment: 1 } },
      select: { id: true, code: true, merchantId: true },
    });
    return link;
  } catch {
    // Code inconnu ou unique constraint → silencieusement null
    return null;
  }
}

/* ============================================================
 * ATTRIBUTION AU REGISTER
 * ============================================================ */

/** Hash léger SHA-256 d'une IP (ou IP prefix anonymisée). */
function hashIp(ipPrefix: string | null): string | null {
  if (!ipPrefix) return null;
  return createHash("sha256").update(ipPrefix).digest("hex").slice(0, 24);
}

/**
 * Crée une attribution PENDING au register.
 * Idempotente : si le filleul a déjà une attribution, ne fait rien.
 * Refuse l'auto-parrainage et le refus de code inconnu.
 *
 * @returns L'attribution créée, ou null si refusée (raison loggée).
 */
export async function attributeMerchantReferral({
  code,
  refereeId,
  ipPrefix,
  fingerprint,
}: {
  code: string;
  refereeId: string;
  ipPrefix: string | null;
  fingerprint: string | null;
}) {
  const link = await prisma.merchantReferralLink.findUnique({
    where: { code },
    select: { id: true, merchantId: true },
  });
  if (!link) {
    console.warn(`[referral] attribution refused: unknown code ${code}`);
    return null;
  }

  // Refus auto-parrainage
  if (link.merchantId === refereeId) {
    console.warn(`[referral] attribution refused: self-referral ${refereeId}`);
    return null;
  }

  // Idempotence : refereeId est @unique sur l'attribution
  const existing = await prisma.merchantReferralAttribution.findUnique({
    where: { refereeId },
    select: { id: true },
  });
  if (existing) return existing;

  try {
    const attribution = await prisma.merchantReferralAttribution.create({
      data: {
        linkId: link.id,
        refereeId,
        refereeIpHash: hashIp(ipPrefix),
        refereeFingerprint: fingerprint,
      },
    });

    await prisma.merchantReferralLink.update({
      where: { id: link.id },
      data: { signups: { increment: 1 } },
    });

    // Notif fire-and-forget au parrain
    await createMerchantNotification({
      merchantId: link.merchantId,
      type: "REFERRAL_SIGNUP",
      title: "Nouveau filleul",
      body: "Un confrère vient de s'inscrire via ton lien parrainage. Crédit appliqué à sa 1ère facture payée.",
      link: "/dashboard/parrainage",
    });

    return attribution;
  } catch (err) {
    console.error("[referral] attribution failed:", err);
    return null;
  }
}

/* ============================================================
 * COOKIE HELPERS
 * ============================================================ */

/**
 * Construit le header Set-Cookie pour le cookie d'attribution parrainage.
 * 30 jours, HttpOnly, SameSite=Lax (cross-site nav OK depuis email/WhatsApp).
 */
export function buildReferralCookieHeader(code: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${MERCHANT_REFERRAL_COOKIE}=${encodeURIComponent(code)}; Path=/; Max-Age=${MERCHANT_REFERRAL_COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax${secure}`;
}

/** Lit le cookie d'attribution depuis le header Cookie. */
export function readReferralCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${MERCHANT_REFERRAL_COOKIE}=([^;]+)`)
  );
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/** Header Set-Cookie qui efface le cookie (utilisé après attribution réussie). */
export function buildClearReferralCookieHeader(): string {
  return `${MERCHANT_REFERRAL_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

/* ============================================================
 * DASHBOARD STATS
 * ============================================================ */

export type MerchantReferralStats = {
  code: string;
  url: string;
  clicks: number;
  signups: number;
  conversions: number;
  monthsEarnedTotal: number;
  monthsRemainingCap: number; // 12 - monthsEarnedTotal
  attributions: {
    id: string;
    status: string; // PENDING | CONFIRMED | REVOKED
    refereePlan: string | null;
    attributedAt: Date;
    confirmedAt: Date | null;
    refereeMaskedName: string; // "Marc V." (pas le nom complet pour vie privée du filleul)
  }[];
};

/** Récupère les stats parrainage d'un merchant pour le dashboard. */
export async function getMerchantReferralStats(
  merchantId: string,
  appUrl: string
): Promise<MerchantReferralStats> {
  const link = await getOrCreateMerchantReferralLink(merchantId);

  const attributions = await prisma.merchantReferralAttribution.findMany({
    where: { linkId: link.id },
    orderBy: { attributedAt: "desc" },
    take: 50,
    select: {
      id: true,
      status: true,
      refereePlan: true,
      attributedAt: true,
      confirmedAt: true,
      referee: { select: { name: true } },
    },
  });

  return {
    code: link.code,
    url: `${appUrl.replace(/\/$/, "")}/r/${link.code}`,
    clicks: link.clicks,
    signups: link.signups,
    conversions: link.conversions,
    monthsEarnedTotal: link.monthsEarnedTotal,
    monthsRemainingCap: Math.max(0, MAX_MONTHS_CUMULATIVE - link.monthsEarnedTotal),
    attributions: attributions.map((a) => ({
      id: a.id,
      status: a.status,
      refereePlan: a.refereePlan,
      attributedAt: a.attributedAt,
      confirmedAt: a.confirmedAt,
      refereeMaskedName: maskName(a.referee.name),
    })),
  };
}

/** "Jean Dupont" → "Jean D." — RGPD-friendly. */
function maskName(name: string | null): string {
  if (!name) return "Anonyme";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

/* ============================================================
 * CONSTANTS EXPORTS
 * ============================================================ */

export {
  MAX_MONTHS_CUMULATIVE,
  SAFETY_WINDOW_DAYS,
};

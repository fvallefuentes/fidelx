/**
 * Newsletter Fidlify — capture des emails de prospects (commerçants
 * intéressés mais pas encore inscrits).
 *
 * Flow double opt-in obligatoire (RGPD/LPD) :
 *   1. POST /api/newsletter/subscribe { email }
 *      → crée NewsletterSubscriber (confirmedAt = null)
 *      → envoie email de confirmation avec lien unique
 *   2. GET /api/newsletter/confirm?token=...
 *      → vérifie le token (hash), set confirmedAt
 *      → l'inscription est officiellement effective
 *
 * Désabonnement 1-clic (RGPD) :
 *   GET /api/newsletter/unsubscribe?token=...
 *   → set unsubscribedAt
 */
import { prisma } from "@/lib/prisma";
import { createHash, randomBytes } from "crypto";
import { getTransporter, getFromAddress } from "@/lib/email/transport";
import { normalizeEmail } from "@/lib/normalize";

const CONFIRM_TTL_DAYS = 7;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.fidlify.com";

export type NewsletterSubscribeInput = {
  email: string;
  locale?: string;
  source?: string;
  referer?: string;
  ipPrefix?: string | null;
  userAgent?: string | null;
};

export type NewsletterSubscribeResult =
  | { ok: true; status: "created" | "resent" | "already_subscribed" }
  | { ok: false; error: string };

/* ============================================================
 * TOKENS
 * ============================================================ */

function generateToken(): { plain: string; hash: string } {
  const plain = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(plain).digest("hex");
  return { plain, hash };
}

function hashToken(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

/* ============================================================
 * SUBSCRIBE
 * ============================================================ */

export async function subscribeToNewsletter(
  input: NewsletterSubscribeInput
): Promise<NewsletterSubscribeResult> {
  const email = normalizeEmail(input.email);
  if (!email || !email.includes("@") || email.length > 200) {
    return { ok: false, error: "Email invalide" };
  }

  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { email },
  });

  // Cas 1 : déjà confirmé et toujours abonné → on dit "déjà inscrit"
  if (existing?.confirmedAt && !existing.unsubscribedAt) {
    return { ok: true, status: "already_subscribed" };
  }

  // Cas 2 : existait mais s'était désabonné → on réactive (re-confirm flow)
  // Cas 3 : existait mais pas confirmé → on regénère le token + renvoie l'email
  // Cas 4 : n'existait pas → on crée

  const confirm = generateToken();
  const unsubscribe = existing?.unsubscribeTokenHash
    ? null
    : generateToken();

  const expiresAt = new Date(Date.now() + CONFIRM_TTL_DAYS * 24 * 60 * 60 * 1000);

  const isNew = !existing;
  if (existing) {
    await prisma.newsletterSubscriber.update({
      where: { email },
      data: {
        confirmTokenHash: confirm.hash,
        confirmTokenExpiresAt: expiresAt,
        unsubscribedAt: null,
        locale: input.locale ?? existing.locale,
        source: input.source ?? existing.source,
        referer: input.referer ?? existing.referer,
        ipPrefix: input.ipPrefix ?? existing.ipPrefix,
        userAgent: input.userAgent ?? existing.userAgent,
      },
    });
  } else {
    await prisma.newsletterSubscriber.create({
      data: {
        email,
        locale: input.locale ?? "fr",
        source: input.source ?? null,
        referer: input.referer ?? null,
        ipPrefix: input.ipPrefix ?? null,
        userAgent: input.userAgent ?? null,
        confirmTokenHash: confirm.hash,
        confirmTokenExpiresAt: expiresAt,
        unsubscribeTokenHash: unsubscribe!.hash,
      },
    });
  }

  // Envoi de l'email de confirmation (double opt-in)
  const confirmUrl = `${APP_URL}/api/newsletter/confirm?token=${confirm.plain}`;
  await sendConfirmEmail(email, confirmUrl, input.locale ?? "fr");

  return { ok: true, status: isNew ? "created" : "resent" };
}

/* ============================================================
 * CONFIRM
 * ============================================================ */

export async function confirmNewsletter(
  token: string
): Promise<{ ok: boolean; email?: string; reason?: string }> {
  if (!token || token.length < 16) {
    return { ok: false, reason: "Token invalide" };
  }
  const hash = hashToken(token);
  const subscriber = await prisma.newsletterSubscriber.findFirst({
    where: { confirmTokenHash: hash },
  });
  if (!subscriber) {
    return { ok: false, reason: "Token introuvable ou déjà utilisé" };
  }
  if (
    subscriber.confirmTokenExpiresAt &&
    subscriber.confirmTokenExpiresAt < new Date()
  ) {
    return { ok: false, reason: "Lien expiré, réinscrivez-vous" };
  }

  await prisma.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: {
      confirmedAt: new Date(),
      confirmTokenHash: null, // consommé
      confirmTokenExpiresAt: null,
      unsubscribedAt: null,
    },
  });

  return { ok: true, email: subscriber.email };
}

/* ============================================================
 * UNSUBSCRIBE
 * ============================================================ */

export async function unsubscribeNewsletter(
  token: string
): Promise<{ ok: boolean; email?: string; reason?: string }> {
  if (!token || token.length < 16) {
    return { ok: false, reason: "Token invalide" };
  }
  const hash = hashToken(token);
  const subscriber = await prisma.newsletterSubscriber.findFirst({
    where: { unsubscribeTokenHash: hash },
  });
  if (!subscriber) {
    return { ok: false, reason: "Lien invalide" };
  }
  if (subscriber.unsubscribedAt) {
    return { ok: true, email: subscriber.email }; // idempotent
  }

  await prisma.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: { unsubscribedAt: new Date() },
  });

  return { ok: true, email: subscriber.email };
}

/* ============================================================
 * EMAIL SENDING
 * ============================================================ */

async function sendConfirmEmail(
  toEmail: string,
  confirmUrl: string,
  _locale: string
): Promise<void> {
  const transporter = getTransporter();

  const subject = "Confirmez votre inscription à la newsletter Fidlify";
  const text = `Bonjour,

Vous avez demandé à recevoir la newsletter Fidlify. Cliquez sur le lien ci-dessous pour confirmer votre inscription (lien valide 7 jours) :

${confirmUrl}

Si vous n'avez pas demandé cette inscription, ignorez simplement cet email — aucune action de votre part n'est nécessaire.

— L'équipe Fidlify
https://www.fidlify.com
`;
  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"></head>
<body style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:32px auto;padding:0 16px;color:#0a0a0a;line-height:1.6;">
  <h1 style="font-size:22px;margin:0 0 16px;">Confirmez votre inscription</h1>
  <p>Bonjour,</p>
  <p>Vous avez demandé à recevoir la newsletter <strong>Fidlify</strong>. Cliquez sur le bouton ci-dessous pour confirmer votre inscription :</p>
  <p style="margin:24px 0;">
    <a href="${confirmUrl}" style="display:inline-block;background:#0a0d04;color:#d4ff4e;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">
      Confirmer mon inscription
    </a>
  </p>
  <p style="font-size:13px;color:#666;">Lien valide 7 jours. Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
    <a href="${confirmUrl}" style="color:#0a0d04;word-break:break-all;">${confirmUrl}</a>
  </p>
  <hr style="border:none;border-top:1px solid #eee;margin:32px 0;">
  <p style="font-size:13px;color:#666;">Si vous n'avez pas demandé cette inscription, ignorez simplement cet email.</p>
  <p style="font-size:12px;color:#999;margin-top:24px;">— L'équipe Fidlify<br><a href="https://www.fidlify.com" style="color:#999;">https://www.fidlify.com</a></p>
</body></html>`;

  if (!transporter) {
    console.log(
      `[newsletter] (no SMTP configured) Would send confirm email to ${toEmail}: ${confirmUrl}`
    );
    return;
  }

  try {
    await transporter.sendMail({
      from: getFromAddress(),
      to: toEmail,
      subject,
      text,
      html,
    });
  } catch (err) {
    console.error("[newsletter] sendConfirmEmail failed:", err);
  }
}

/* ============================================================
 * ADMIN HELPERS
 * ============================================================ */

export async function listConfirmedSubscribers(limit = 1000) {
  return prisma.newsletterSubscriber.findMany({
    where: { confirmedAt: { not: null }, unsubscribedAt: null },
    orderBy: { confirmedAt: "desc" },
    take: limit,
    select: {
      id: true,
      email: true,
      locale: true,
      source: true,
      confirmedAt: true,
      createdAt: true,
    },
  });
}

export async function newsletterStats() {
  const [total, confirmed, unsubscribed, pending] = await Promise.all([
    prisma.newsletterSubscriber.count(),
    prisma.newsletterSubscriber.count({
      where: { confirmedAt: { not: null }, unsubscribedAt: null },
    }),
    prisma.newsletterSubscriber.count({
      where: { unsubscribedAt: { not: null } },
    }),
    prisma.newsletterSubscriber.count({
      where: { confirmedAt: null, unsubscribedAt: null },
    }),
  ]);
  return { total, confirmed, unsubscribed, pending };
}

/**
 * 2FA par email — code à 6 chiffres envoyé à chaque login d'un user
 * qui a email2faEnabled=true.
 *
 * Modèle plus simple que TOTP (RFC 6238) :
 *  - Pas d'app à installer
 *  - Pas de QR code à scanner
 *  - Pas de backup codes à imprimer
 *  - L'inbox du user fait office de "second facteur"
 *
 * Sécurité :
 *  - Code 6 chiffres = 1M combos
 *  - TTL 10 minutes
 *  - Hash sha256 en DB (jamais le code en clair)
 *  - Usage unique (usedAt)
 *  - Max 5 tentatives par code (anti brute force)
 *  - Rate limit : max 3 codes générés par user / 15 min (anti spam SMTP)
 */
import { prisma } from "@/lib/prisma";
import { createHash, randomInt } from "crypto";
import { getTransporter, getFromAddress } from "@/lib/email/transport";

const CODE_LENGTH = 6;
const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS_PER_CODE = 5;
const MAX_CODES_PER_15MIN = 3;

/* ============================================================
 * GÉNÉRATION + ENVOI
 * ============================================================ */

/** Hash sha256 hex d'un code (normalisé : digits uniquement). */
function hashCode(code: string): string {
  const normalized = code.replace(/\D/g, "");
  return createHash("sha256").update(normalized).digest("hex");
}

/** Génère un code aléatoire à 6 chiffres (uniformément réparti). */
function generateRandomCode(): string {
  // randomInt sécurisé via crypto, 100_000 ≤ x < 1_000_000
  return String(randomInt(100_000, 1_000_000));
}

export type SendCodeResult =
  | { ok: true }
  | { ok: false; reason: "rate_limited" | "user_not_found" | "send_failed" };

/**
 * Génère un nouveau code, le persiste hashé, puis envoie l'email.
 * Rate-limited : max 3 codes / 15min pour un même user.
 */
export async function sendLoginCode(input: {
  userId: string;
  email: string;
  ipPrefix?: string | null;
}): Promise<SendCodeResult> {
  // Rate limit : combien de codes ont été générés ces 15 dernières minutes ?
  const since = new Date(Date.now() - 15 * 60 * 1000);
  const recent = await prisma.emailLoginCode.count({
    where: { userId: input.userId, createdAt: { gte: since } },
  });
  if (recent >= MAX_CODES_PER_15MIN) {
    console.warn(`[email-2fa] rate limit hit for user ${input.userId} (${recent} codes/15min)`);
    return { ok: false, reason: "rate_limited" };
  }

  const code = generateRandomCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  // Invalide les codes en cours pour ce user (un seul code valide à la fois)
  await prisma.emailLoginCode.updateMany({
    where: { userId: input.userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.emailLoginCode.create({
    data: {
      userId: input.userId,
      codeHash,
      expiresAt,
      ipPrefix: input.ipPrefix ?? null,
    },
  });

  const sent = await sendCodeEmail(input.email, code);
  return sent ? { ok: true } : { ok: false, reason: "send_failed" };
}

/* ============================================================
 * VÉRIFICATION
 * ============================================================ */

export type VerifyCodeResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" | "exhausted" | "not_found" };

/**
 * Vérifie un code soumis par le user pour son userId.
 * - Match du hash sha256
 * - Pas encore utilisé (usedAt null)
 * - Pas expiré
 * - Tentatives < MAX_ATTEMPTS_PER_CODE
 *
 * En cas de succès, marque le code comme utilisé (single use).
 * En cas d'échec, incrémente attempts (et invalide si seuil atteint).
 */
export async function verifyLoginCode(
  userId: string,
  submittedCode: string
): Promise<VerifyCodeResult> {
  const normalized = submittedCode.replace(/\D/g, "");
  if (normalized.length !== CODE_LENGTH) return { ok: false, reason: "invalid" };
  const candidateHash = hashCode(normalized);

  // On prend le code le plus récent non utilisé pour ce user.
  const latest = await prisma.emailLoginCode.findFirst({
    where: { userId, usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!latest) return { ok: false, reason: "not_found" };
  if (latest.expiresAt < new Date()) {
    return { ok: false, reason: "expired" };
  }
  if (latest.attempts >= MAX_ATTEMPTS_PER_CODE) {
    // Brute force détecté : on marque le code comme consommé
    await prisma.emailLoginCode.update({
      where: { id: latest.id },
      data: { usedAt: new Date() },
    });
    return { ok: false, reason: "exhausted" };
  }

  if (latest.codeHash !== candidateHash) {
    await prisma.emailLoginCode.update({
      where: { id: latest.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: "invalid" };
  }

  // OK : marquer comme utilisé
  await prisma.emailLoginCode.update({
    where: { id: latest.id },
    data: { usedAt: new Date() },
  });
  return { ok: true };
}

/* ============================================================
 * EMAIL TEMPLATE
 * ============================================================ */

async function sendCodeEmail(toEmail: string, code: string): Promise<boolean> {
  const transporter = getTransporter();

  const subject = `Code de connexion Fidlify — ${code}`;
  const text = `Bonjour,

Votre code de connexion Fidlify :

    ${code}

Ce code expire dans 10 minutes et n'est utilisable qu'une seule fois.

Si vous n'avez pas tenté de vous connecter, ignorez cet email et changez votre mot de passe par précaution.

— L'équipe Fidlify
https://www.fidlify.com
`;
  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"></head>
<body style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:32px auto;padding:0 16px;color:#0a0a0a;line-height:1.6;background:#f6f7f5;">
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:36px 30px;">
    <h1 style="font-size:20px;margin:0 0 12px;letter-spacing:-0.01em;">Code de connexion Fidlify</h1>
    <p style="color:#555;font-size:14px;margin:0 0 26px;">Entrez ce code dans la page de connexion pour finaliser votre authentification :</p>
    <div style="font-family:'JetBrains Mono',Menlo,monospace;font-size:38px;letter-spacing:0.36em;text-align:center;font-weight:600;color:#0a0d04;background:#f0fa9a;padding:22px 14px;border-radius:10px;margin:0 0 26px;">
      ${code.slice(0, 3)} ${code.slice(3)}
    </div>
    <p style="font-size:13px;color:#666;margin:0 0 8px;">⏱ Ce code expire dans <strong>10 minutes</strong> et n'est utilisable qu'une seule fois.</p>
    <p style="font-size:13px;color:#666;margin:0;">🛡 Si vous n'avez pas tenté de vous connecter, ignorez cet email et changez votre mot de passe par précaution.</p>
  </div>
  <p style="font-size:11px;color:#999;text-align:center;margin-top:18px;">— L'équipe Fidlify · <a href="https://www.fidlify.com" style="color:#999;">fidlify.com</a></p>
</body></html>`;

  if (!transporter) {
    console.log(
      `[email-2fa] (no SMTP configured) Would send code ${code} to ${toEmail}`
    );
    return true; // mode dev : on simule
  }

  try {
    await transporter.sendMail({
      from: getFromAddress(),
      to: toEmail,
      subject,
      text,
      html,
    });
    return true;
  } catch (err) {
    console.error("[email-2fa] sendCodeEmail failed:", err);
    return false;
  }
}

/* ============================================================
 * CONSTANTS
 * ============================================================ */

export {
  CODE_LENGTH,
  CODE_TTL_MS,
  MAX_ATTEMPTS_PER_CODE,
  MAX_CODES_PER_15MIN,
};

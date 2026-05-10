import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getFromAddress, getTransporter } from "./transport";
import { verificationCodeEmail } from "./templates";

/**
 * Vérification d'email par code OTP à 6 chiffres.
 *
 * Sécurité :
 * - Code 6 chiffres (1 000 000 combinaisons), TTL 15 min
 * - Hash bcrypt (cost 8) en DB → pas de fuite si dump
 * - Max 5 tentatives par code → brute force impossible
 * - Cooldown resend 60s côté API (timestamps + check createdAt)
 * - Tous les codes en cours pour un email sont invalidés à chaque
 *   nouvelle génération (un seul code valide à la fois)
 */

export const CODE_TTL_MINUTES = 15;
export const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_SECONDS = 60;

/** Génère un code 6 chiffres avec premier chiffre ≠ 0 (UX). */
function generateCode(): string {
  const first = 1 + Math.floor(Math.random() * 9);
  let rest = "";
  for (let i = 0; i < 5; i++) {
    rest += Math.floor(Math.random() * 10);
  }
  return `${first}${rest}`;
}

/** Crée et envoie un nouveau code de vérification. */
export async function issueVerificationCode(email: string): Promise<{
  ok: boolean;
  cooldownUntil?: Date;
  /** True si SMTP n'est pas configuré et le code a juste été loggé. */
  devModeNoSmtp?: boolean;
}> {
  const normalized = email.trim().toLowerCase();

  // Cooldown : empêcher la création d'un nouveau code si le dernier
  // a moins de RESEND_COOLDOWN_SECONDS secondes
  const last = await prisma.emailVerificationCode.findFirst({
    where: { email: normalized },
    orderBy: { createdAt: "desc" },
  });
  if (last) {
    const elapsed = Date.now() - last.createdAt.getTime();
    if (elapsed < RESEND_COOLDOWN_SECONDS * 1000) {
      return {
        ok: false,
        cooldownUntil: new Date(
          last.createdAt.getTime() + RESEND_COOLDOWN_SECONDS * 1000
        ),
      };
    }
  }

  // Invalider tout code en cours pour cet email
  await prisma.emailVerificationCode.updateMany({
    where: { email: normalized, usedAt: null },
    data: { usedAt: new Date() },
  });

  // Générer + hasher
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 8);
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  await prisma.emailVerificationCode.create({
    data: { email: normalized, codeHash, expiresAt },
  });

  // Envoyer
  const transporter = getTransporter();
  const { subject, html, text } = verificationCodeEmail({
    code,
    ttlMinutes: CODE_TTL_MINUTES,
  });

  if (!transporter) {
    // Mode dev/sans SMTP : on log et on retourne ok=true mais devModeNoSmtp=true
    console.warn(
      `[email] SMTP not configured. Verification code for ${normalized}: ${code} (TTL ${CODE_TTL_MINUTES}min)`
    );
    return { ok: true, devModeNoSmtp: true };
  }

  await transporter.sendMail({
    from: getFromAddress(),
    to: normalized,
    subject,
    html,
    text,
  });

  return { ok: true };
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "no_code" | "expired" | "too_many_attempts" | "invalid_code" };

/** Vérifie un code soumis par l'utilisateur. */
export async function verifyCode(
  email: string,
  code: string
): Promise<VerifyResult> {
  const normalized = email.trim().toLowerCase();
  const cleaned = code.replace(/\s/g, "");

  if (!/^\d{6}$/.test(cleaned)) {
    return { ok: false, reason: "invalid_code" };
  }

  // Récupérer le dernier code non utilisé pour cet email
  const record = await prisma.emailVerificationCode.findFirst({
    where: { email: normalized, usedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return { ok: false, reason: "no_code" };
  }

  if (record.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: "too_many_attempts" };
  }

  const isValid = await bcrypt.compare(cleaned, record.codeHash);

  // Toujours incrémenter attempts (succès ou échec)
  await prisma.emailVerificationCode.update({
    where: { id: record.id },
    data: {
      attempts: record.attempts + 1,
      usedAt: isValid ? new Date() : null,
    },
  });

  if (!isValid) {
    if (record.attempts + 1 >= MAX_ATTEMPTS) {
      return { ok: false, reason: "too_many_attempts" };
    }
    return { ok: false, reason: "invalid_code" };
  }

  return { ok: true };
}

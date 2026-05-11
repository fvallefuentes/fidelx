import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email/password-reset";
import { normalizeEmail } from "@/lib/normalize";

const TTL_HOURS = 24;
const RATE_LIMIT_MAX = 3; // max 3 demandes
const RATE_LIMIT_WINDOW_MS = 15 * 60_000; // par 15 min par email

/**
 * POST /api/auth/forgot-password
 * Body : { email: string }
 *
 * Génère un token de reset password (TTL 24h, single-use) et l'envoie
 * par email à l'utilisateur. Anti-enumeration : la réponse est toujours
 * 200 OK, peu importe que l'email existe ou pas.
 *
 * Rate limit : 3 demandes / 15 min / email normalisé.
 */
export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const email = normalizeEmail(body?.email);
  if (!email) {
    return NextResponse.json({ error: "Email requis" }, { status: 400 });
  }

  // Petit délai random pour limiter le timing-side-channel sur l'existence email
  await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true },
  });

  // Anti-enumeration : on retourne 200 même si l'email n'existe pas
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  // Rate-limit : compter les tokens créés pour ce user dans la fenêtre
  const recentCount = await prisma.passwordResetToken.count({
    where: {
      userId: user.id,
      createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
    },
  });
  if (recentCount >= RATE_LIMIT_MAX) {
    // Réponse opaque (200) — on dit qu'on a envoyé mais on n'envoie pas
    // pour éviter de spammer la boîte mail de l'utilisateur.
    return NextResponse.json({ ok: true });
  }

  // Invalider les anciens tokens non-utilisés
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  // Générer le token + son hash sha256
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt, createdBy: null },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.fidlify.com";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  // Fire-and-forget : on n'attend pas l'envoi pour répondre
  void sendPasswordResetEmail({
    toEmail: email,
    firstName: user.name,
    resetUrl,
    ttlHours: TTL_HOURS,
  });

  return NextResponse.json({ ok: true });
}

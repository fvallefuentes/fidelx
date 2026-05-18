import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendLoginCode } from "@/lib/auth/email-2fa";
import { extractContext } from "@/lib/anti-abuse/fingerprint";

/**
 * POST /api/auth/email-2fa/send-code
 * Body: { email, password }
 *
 * Renvoie un code 2FA par email pour un user qui a déjà validé son
 * email/password mais qui veut un nouveau code (timeout du précédent,
 * ou bouton "Renvoyer le code" sur la page login).
 *
 * Réponse opaque : on retourne toujours { ok: true } (même si email
 * inexistant ou password faux) pour éviter l'énumération.
 */
const schema = z.object({
  email: z.email("Email invalide").trim().toLowerCase().max(200),
  password: z.string().min(1).max(256),
});

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, schema);
  if (!parsed.ok) return NextResponse.json({ ok: true });

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      email2faEnabled: true,
      emailVerified: true,
      suspendedAt: true,
    },
  });

  // Réponse opaque dans tous les cas négatifs
  if (!user || !user.passwordHash) return NextResponse.json({ ok: true });
  if (!user.email2faEnabled) return NextResponse.json({ ok: true });
  if (!user.emailVerified) return NextResponse.json({ ok: true });
  if (user.suspendedAt) return NextResponse.json({ ok: true });

  const passwordOk = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!passwordOk) return NextResponse.json({ ok: true });

  const ctx = extractContext(req);
  await sendLoginCode({
    userId: user.id,
    email: user.email,
    ipPrefix: ctx.ipPrefix,
  });

  return NextResponse.json({ ok: true });
}

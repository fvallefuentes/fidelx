import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/auth/reset-password
 * Body : { token: string, password: string }
 *
 * Le user a reçu un lien de reset (admin l'a généré via /api/admin/users/[id]/reset-password).
 * Cet endpoint vérifie le token (sha256), invalide-le, et met à jour le hash du mot de passe.
 */

export async function POST(req: Request) {
  const body = await req.json();
  const token = String(body?.token || "").trim();
  const password = String(body?.password || "");

  if (!token) {
    return NextResponse.json({ error: "Token requis" }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "Mot de passe : minimum 8 caractères" },
      { status: 400 }
    );
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!record) {
    return NextResponse.json(
      { error: "Lien de reset invalide" },
      { status: 400 }
    );
  }
  if (record.usedAt) {
    return NextResponse.json(
      { error: "Ce lien a déjà été utilisé" },
      { status: 400 }
    );
  }
  if (record.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "Lien expiré. Demandez à l'admin de générer un nouveau." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Update password + invalider le token + invalider tous les autres tokens du user
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    email: record.user.email,
  });
}

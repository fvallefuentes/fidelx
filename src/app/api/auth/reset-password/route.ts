import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseJsonBody } from "@/lib/api/validation";

const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, "Token requis"),
  password: z.string().min(8, "Mot de passe : minimum 8 caractères").max(256, "Mot de passe trop long"),
});

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, resetPasswordSchema);
  if (!parsed.ok) return parsed.response;
  const { token, password } = parsed.data;

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

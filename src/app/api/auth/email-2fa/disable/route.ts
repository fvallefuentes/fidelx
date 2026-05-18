import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";

/**
 * POST /api/auth/email-2fa/disable
 *
 * Désactive la 2FA par email. Exige le mot de passe en plus (defense
 * in depth — un attaquant qui a volé une session ne doit pas pouvoir
 * désactiver le 2FA seul).
 *
 * Réservé aux ADMIN.
 */
const schema = z.object({
  password: z.string().min(1, "Mot de passe requis"),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if ((session.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Le 2FA est réservé aux comptes administrateurs Fidlify." },
      { status: 403 }
    );
  }

  const parsed = await parseJsonBody(req, schema);
  if (!parsed.ok) return parsed.response;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, passwordHash: true, email2faEnabled: true },
  });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  if (!user.email2faEnabled) {
    return NextResponse.json({ ok: true, alreadyDisabled: true });
  }
  if (!user.passwordHash) {
    return NextResponse.json({ error: "Compte sans mot de passe" }, { status: 400 });
  }

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { email2faEnabled: false },
  });

  // Invalide tous les codes 2FA en cours pour ce user
  await prisma.emailLoginCode.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

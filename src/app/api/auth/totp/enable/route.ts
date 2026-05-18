import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import {
  verifyTotpCode,
  generateBackupCodes,
} from "@/lib/auth/totp";

/**
 * POST /api/auth/totp/enable
 *
 * Étape 2 du flow d'activation : le user a scanné le QR avec son app TOTP
 * et envoie le code à 6 chiffres + le secret reçu de /setup. Si le code
 * matche, on flip totpEnabled=true et on retourne 10 backup codes en clair
 * (montrés UNE seule fois — l'utilisateur doit les sauver).
 */

const schema = z.object({
  secret: z.string().min(16).max(64),
  code: z.string().min(6).max(8),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const parsed = await parseJsonBody(req, schema);
  if (!parsed.ok) return parsed.response;
  const { secret, code } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, totpEnabled: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }
  if (user.totpEnabled) {
    return NextResponse.json(
      { error: "2FA déjà activée" },
      { status: 400 }
    );
  }

  if (!(await verifyTotpCode(secret, code))) {
    return NextResponse.json(
      { error: "Code invalide. Vérifiez l'heure de votre téléphone et réessayez." },
      { status: 400 }
    );
  }

  // Génère + persiste les backup codes (hashes uniquement)
  const { plainCodes, hashedCodes } = generateBackupCodes();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      totpEnabled: true,
      totpSecret: secret,
      totpBackupCodes: hashedCodes as never,
    },
  });

  return NextResponse.json({
    ok: true,
    backupCodes: plainCodes,
  });
}

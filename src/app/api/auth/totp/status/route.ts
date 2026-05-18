import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/auth/totp/status
 * Renvoie { enabled, backupCodesRemaining } pour le user courant.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { totpEnabled: true, totpBackupCodes: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    enabled: user.totpEnabled,
    backupCodesRemaining: Array.isArray(user.totpBackupCodes)
      ? (user.totpBackupCodes as string[]).length
      : 0,
  });
}

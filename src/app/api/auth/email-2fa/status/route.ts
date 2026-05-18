import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/auth/email-2fa/status
 * Renvoie { enabled } pour le user courant (ADMIN uniquement).
 */
export async function GET() {
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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, email2faEnabled: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    enabled: user.email2faEnabled,
    email: user.email,
  });
}

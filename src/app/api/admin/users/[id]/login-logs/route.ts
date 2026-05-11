import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/users/[id]/login-logs
 * Retourne les 100 derniers logs de connexion d'un user (succès + échecs).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  // On filtre par userId mais on inclut aussi par email (pour les attempts
  // sur un compte qui n'avait pas encore d'userId résolu — théoriquement
  // rare mais utile pour le debug)
  const user = await prisma.user.findUnique({
    where: { id },
    select: { email: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }

  const logs = await prisma.loginLog.findMany({
    where: {
      OR: [{ userId: id }, { email: user.email.toLowerCase() }],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ logs });
}

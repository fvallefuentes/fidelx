import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createHash, randomBytes } from "crypto";
import { logAdminAction } from "@/lib/admin/audit";

/**
 * POST /api/admin/users/[id]/reset-password
 * Génère un token de reset password à usage unique (TTL 24h).
 * Retourne l'URL complète à transmettre à l'utilisateur (out-of-band).
 *
 * Le token clair n'est jamais stocké — seul son sha256 est en DB.
 */

const TTL_HOURS = 24;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }

  // Invalider les tokens en cours pour ce user
  await prisma.passwordResetToken.updateMany({
    where: { userId: id, usedAt: null },
    data: { usedAt: new Date() },
  });

  // Générer un token clair (256 bits) + son hash sha256
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId: id,
      tokenHash,
      expiresAt,
      createdBy: session.user?.id ?? null,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.fidlify.com";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  await logAdminAction({
    adminId: session.user!.id!,
    action: "RESET_USER_PASSWORD",
    targetType: "USER",
    targetId: target.id,
    targetLabel: target.email,
    metadata: { ttlHours: TTL_HOURS },
    req,
  });

  return NextResponse.json({
    ok: true,
    email: target.email,
    resetUrl,
    expiresAt,
    ttlHours: TTL_HOURS,
  });
}

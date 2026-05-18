import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin/audit";

/**
 * DELETE /api/admin/abuse/block-ip/[id]
 * Débloque une IP (suppression de l'entrée BlockedIp).
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  // Capture le label (IP prefix) avant suppression
  const existing = await prisma.blockedIp.findUnique({
    where: { id },
    select: { ipPrefix: true },
  });

  await prisma.blockedIp.delete({ where: { id } }).catch(() => {});

  await logAdminAction({
    adminId: session!.user!.id!,
    action: "UNBLOCK_IP",
    targetType: "IP",
    targetId: id,
    targetLabel: existing?.ipPrefix ?? null,
    req,
  });

  return NextResponse.json({ ok: true });
}

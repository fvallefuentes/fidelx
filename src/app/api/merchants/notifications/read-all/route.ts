import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** POST /api/merchants/notifications/read-all : marquer toutes comme lues. */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const merchantId =
    (session.user as { merchantId?: string }).merchantId ?? session.user.id;

  const result = await prisma.merchantNotification.updateMany({
    where: { merchantId, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true, updated: result.count });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** POST /api/merchants/notifications/[id]/read : marque une notif comme lue. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const merchantId =
    (session.user as { merchantId?: string }).merchantId ?? session.user.id;

  const notif = await prisma.merchantNotification.findUnique({
    where: { id },
    select: { merchantId: true, readAt: true },
  });
  if (!notif || notif.merchantId !== merchantId) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  if (notif.readAt) {
    return NextResponse.json({ ok: true });
  }

  await prisma.merchantNotification.update({
    where: { id },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/users/[id]/suspend
 * Body: { reason?: string }
 * Suspend un user (préserve ses données, mais bloque la connexion).
 *
 * DELETE /api/admin/users/[id]/suspend
 * Désuspend un user.
 */

async function ensureAdmin() {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string })?.role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await ensureAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  // Empêcher l'admin de se suspendre lui-même
  if (session.user?.id === id) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas suspendre votre propre compte" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.trim() : null;

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, suspendedAt: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }
  if (target.role === "ADMIN") {
    return NextResponse.json(
      { error: "Impossible de suspendre un autre admin" },
      { status: 400 }
    );
  }
  if (target.suspendedAt) {
    return NextResponse.json({
      ok: true,
      alreadySuspended: true,
    });
  }

  await prisma.user.update({
    where: { id },
    data: {
      suspendedAt: new Date(),
      suspendedReason: reason,
      suspendedById: session.user?.id ?? null,
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await ensureAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  await prisma.user.update({
    where: { id },
    data: {
      suspendedAt: null,
      suspendedReason: null,
      suspendedById: null,
    },
  });
  return NextResponse.json({ ok: true });
}

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const programId = new URL(req.url).searchParams.get("programId");
  if (!programId) {
    return NextResponse.json({ error: "Programme requis" }, { status: 400 });
  }

  const program = await prisma.loyaltyProgram.findFirst({
    where: { id: programId, merchantId: session.user.id, isActive: true },
    select: { id: true },
  });
  if (!program) {
    return NextResponse.json({ error: "Programme introuvable" }, { status: 404 });
  }

  const cards = await prisma.loyaltyCard.findMany({
    where: { programId, status: "ACTIVE" },
    select: {
      id: true,
      clientId: true,
      totalVisits: true,
      lastVisitAt: true,
      client: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: [{ client: { firstName: "asc" } }, { createdAt: "asc" }],
  });

  return NextResponse.json(cards);
}

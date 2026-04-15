import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const programs = await prisma.loyaltyProgram.findMany({
    where: { merchantId: session.user.id },
    select: { id: true },
  });

  const programIds = programs.map((p) => p.id);

  const cards = await prisma.loyaltyCard.findMany({
    where: { programId: { in: programIds } },
    include: {
      client: {
        select: { id: true, firstName: true, email: true, phone: true },
      },
      program: {
        select: { name: true, type: true, config: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(cards);
}

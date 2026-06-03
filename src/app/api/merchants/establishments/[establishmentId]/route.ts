import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ establishmentId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const { establishmentId } = await params;

  const establishment = await prisma.establishment.findFirst({
    where: {
      id: establishmentId,
      merchantId: session.user.id,
    },
    select: { id: true },
  });

  if (!establishment) {
    return NextResponse.json(
      { error: "Etablissement introuvable" },
      { status: 404 }
    );
  }

  const [programs, transactions] = await prisma.$transaction([
    prisma.loyaltyProgram.updateMany({
      where: {
        establishmentId,
        merchantId: session.user.id,
      },
      data: {
        establishmentId: null,
        googleReviewEnabled: false,
      },
    }),
    prisma.transaction.updateMany({
      where: {
        establishmentId,
        card: {
          program: {
            merchantId: session.user.id,
          },
        },
      },
      data: { establishmentId: null },
    }),
    prisma.establishment.delete({
      where: { id: establishmentId },
    }),
  ]);

  return NextResponse.json({
    success: true,
    detachedPrograms: programs.count,
    detachedTransactions: transactions.count,
  });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ programId: string }> }
) {
  const { programId } = await params;

  const program = await prisma.loyaltyProgram.findUnique({
    where: { id: programId, isActive: true },
    select: {
      id: true,
      name: true,
      type: true,
      config: true,
      cardDesign: true,
      merchant: { select: { name: true } },
      establishment: { select: { name: true, address: true } },
    },
  });

  if (!program) {
    return NextResponse.json(
      { error: "Programme introuvable" },
      { status: 404 }
    );
  }

  return NextResponse.json(program);
}

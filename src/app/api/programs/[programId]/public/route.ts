import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlanLimits } from "@/lib/plan-limits";

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
      merchant: { select: { name: true, plan: true } },
      establishment: { select: { name: true, address: true } },
    },
  });

  if (!program) {
    return NextResponse.json({ error: "Programme introuvable" }, { status: 404 });
  }

  const limits = getPlanLimits(program.merchant.plan);

  return NextResponse.json({
    ...program,
    showFidlifyBranding: limits.showFidlifyBranding,
    merchant: { name: program.merchant.name }, // ne pas exposer le plan
  });
}

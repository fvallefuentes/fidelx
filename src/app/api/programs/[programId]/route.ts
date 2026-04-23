import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ programId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { programId } = await params;

  // Vérifier que le programme appartient bien au marchand connecté
  const program = await prisma.loyaltyProgram.findUnique({
    where: { id: programId },
    select: { merchantId: true },
  });

  if (!program) {
    return NextResponse.json({ error: "Programme introuvable" }, { status: 404 });
  }

  if (program.merchantId !== session.user.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    // 1. Récupérer les IDs des récompenses du programme
    const rewards = await prisma.reward.findMany({
      where: { programId },
      select: { id: true },
    });
    const rewardIds = rewards.map((r) => r.id);

    // 2. Supprimer les RewardClaims liés (pas de cascade sur rewardId)
    if (rewardIds.length > 0) {
      await prisma.rewardClaim.deleteMany({
        where: { rewardId: { in: rewardIds } },
      });
    }

    // 3. Dissocier les campagnes liées (programId optionnel, pas de cascade)
    await prisma.notificationCampaign.updateMany({
      where: { programId },
      data: { programId: null },
    });

    // 4. Supprimer le programme (cascade sur cards, rewards, transactions...)
    await prisma.loyaltyProgram.delete({ where: { id: programId } });
  } catch (err) {
    console.error("Delete program error:", err);
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

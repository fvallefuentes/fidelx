import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanLimits } from "@/lib/plan-limits";
import { notifyPassUpdate } from "@/lib/wallet/push";
import type { Prisma } from "@/generated/prisma/client";

/* ─── PATCH : modifier le design + nom + description du programme ───
   Le nombre de tampons (maxStamps), le type de programme et la config
   structurelle ne sont volontairement PAS modifiables car cela casserait
   les progressions des cartes déjà émises. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ programId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { programId } = await params;

  const program = await prisma.loyaltyProgram.findUnique({
    where: { id: programId },
    select: {
      id: true,
      merchantId: true,
      name: true,
      cardDesign: true,
    },
  });

  if (!program) {
    return NextResponse.json(
      { error: "Programme introuvable" },
      { status: 404 }
    );
  }
  if (program.merchantId !== session.user.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = (await req.json()) as {
    name?: string;
    cardDesign?: {
      bgColor?: string;
      textColor?: string;
      stampColor?: string;
      stampCheckColor?: string;
      stampEmptyColor?: string;
      labelColor?: string;
      logoData?: string | null;
      description?: string;
    };
  };

  // Gating : logo personnalisé réservé aux plans payants
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true },
  });
  const limits = getPlanLimits(user?.plan);
  const wantsCustomLogo =
    body.cardDesign && typeof body.cardDesign.logoData === "string";
  if (wantsCustomLogo && limits.showFidlifyBranding) {
    return NextResponse.json(
      {
        error:
          "Le logo personnalisé est réservé aux abonnements payants. Passez au plan Essentiel ou supérieur pour débloquer.",
      },
      { status: 403 }
    );
  }

  // Construction du nouveau cardDesign en mergeant l'existant
  const currentDesign =
    (program.cardDesign as Record<string, unknown>) ?? {};
  type Design = Record<string, unknown>;
  const nextDesign: Design = { ...currentDesign };
  if (body.cardDesign) {
    const allowed: (keyof typeof body.cardDesign)[] = [
      "bgColor",
      "textColor",
      "stampColor",
      "stampCheckColor",
      "stampEmptyColor",
      "labelColor",
      "description",
    ];
    for (const k of allowed) {
      if (body.cardDesign[k] !== undefined) {
        nextDesign[k] = body.cardDesign[k];
      }
    }
    // logoData : autorisé uniquement plan payant. null explicite = suppression.
    if (!limits.showFidlifyBranding) {
      if (body.cardDesign.logoData === null) {
        delete nextDesign.logoData;
      } else if (typeof body.cardDesign.logoData === "string") {
        nextDesign.logoData = body.cardDesign.logoData;
      }
    }
  }

  const updated = await prisma.loyaltyProgram.update({
    where: { id: programId },
    data: {
      name: typeof body.name === "string" && body.name.trim()
        ? body.name.trim()
        : program.name,
      cardDesign: nextDesign as Prisma.InputJsonValue,
    },
    select: {
      id: true,
      name: true,
      cardDesign: true,
    },
  });

  // Propager le nouveau design aux cartes Wallet existantes via push.
  // Apple/Google Wallet refetcheront le pass à jour (la génération du
  // pass utilise cardDesign à la volée).
  try {
    const cards = await prisma.loyaltyCard.findMany({
      where: { programId },
      select: { id: true },
    });
    // 1. APPLE WALLET : push silencieux à chaque iPhone enregistré.
    //    Le .pkpass est régénéré à la volée avec le nouveau cardDesign.
    void Promise.allSettled(
      cards.map((c) => notifyPassUpdate(c.id))
    ).catch(() => {});
    // 2. GOOGLE WALLET : update la LoyaltyClass (où vit le design côté
    //    Google). Toutes les cartes existantes héritent automatiquement.
    try {
      const { updateGoogleWalletClass } = await import("@/lib/wallet/google");
      void updateGoogleWalletClass(programId).catch(() => {});
    } catch (e) {
      console.error(
        "[programs/patch] google class update failed:",
        (e as Error).message
      );
    }
  } catch (e) {
    console.error("[programs/patch] propagation failed:", (e as Error).message);
  }

  return NextResponse.json(updated);
}

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

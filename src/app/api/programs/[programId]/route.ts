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
      heroImage?: string | null;
      stampIcon?: string;
      stampBgType?: "none" | "color" | "image";
      stampBgColor?: string | null;
      stampBgColor2?: string | null;
      stampBgImage?: string | null;
      description?: string;
    };
    // Avis Google — modifiables sur un programme existant (ne casse aucune
    // progression de carte, contrairement au type/maxStamps).
    googleReviewEnabled?: boolean;
    googleReviewBonus?: number;
    googleReviewMinVisits?: number;
    establishmentId?: string | null;
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
      // heroImage : même gating que logoData (plan payant uniquement)
      if (body.cardDesign.heroImage === null) {
        delete nextDesign.heroImage;
      } else if (typeof body.cardDesign.heroImage === "string") {
        nextDesign.heroImage = body.cardDesign.heroImage;
      }

      // Personnalisation tampons (plan payant uniquement).
      if (typeof body.cardDesign.stampIcon === "string") {
        nextDesign.stampIcon = body.cardDesign.stampIcon;
      }
      if (typeof body.cardDesign.stampBgType === "string") {
        nextDesign.stampBgType = body.cardDesign.stampBgType;
      }
      // Couleurs / image du fond : null = suppression, string = set.
      for (const k of ["stampBgColor", "stampBgColor2", "stampBgImage"] as const) {
        if (body.cardDesign[k] === null) {
          delete nextDesign[k];
        } else if (typeof body.cardDesign[k] === "string") {
          nextDesign[k] = body.cardDesign[k];
        }
      }
    }
  }

  // Validation de l'établissement : doit appartenir au merchant.
  let establishmentUpdate: string | null | undefined = undefined;
  if (body.establishmentId !== undefined) {
    if (body.establishmentId === null || body.establishmentId === "") {
      establishmentUpdate = null;
    } else {
      const est = await prisma.establishment.findFirst({
        where: { id: body.establishmentId, merchantId: session.user.id },
        select: { id: true },
      });
      establishmentUpdate = est ? est.id : undefined; // ignore si pas au merchant
    }
  }

  const updated = await prisma.loyaltyProgram.update({
    where: { id: programId },
    data: {
      name: typeof body.name === "string" && body.name.trim()
        ? body.name.trim()
        : program.name,
      cardDesign: nextDesign as Prisma.InputJsonValue,
      ...(typeof body.googleReviewEnabled === "boolean"
        ? { googleReviewEnabled: body.googleReviewEnabled }
        : {}),
      ...(typeof body.googleReviewBonus === "number"
        ? { googleReviewBonus: Math.max(0, Math.min(100, Math.round(body.googleReviewBonus))) }
        : {}),
      ...(typeof body.googleReviewMinVisits === "number"
        ? { googleReviewMinVisits: Math.max(1, Math.min(100, Math.round(body.googleReviewMinVisits))) }
        : {}),
      ...(establishmentUpdate !== undefined
        ? { establishmentId: establishmentUpdate }
        : {}),
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
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const { programId } = await params;

  const program = await prisma.loyaltyProgram.findUnique({
    where: { id: programId },
    select: { merchantId: true },
  });

  if (!program) {
    return NextResponse.json({ error: "Programme introuvable" }, { status: 404 });
  }

  if (program.merchantId !== session.user.id) {
    return NextResponse.json({ error: "Non autorise" }, { status: 403 });
  }

  try {
    const [cardsCount, transactionsCount, campaignsCount, rewardClaimsCount] =
      await prisma.$transaction([
        prisma.loyaltyCard.count({ where: { programId } }),
        prisma.transaction.count({ where: { card: { programId } } }),
        prisma.notificationCampaign.count({ where: { programId } }),
        prisma.rewardClaim.count({ where: { reward: { programId } } }),
      ]);

    const hasHistoricalData =
      cardsCount > 0 ||
      transactionsCount > 0 ||
      campaignsCount > 0 ||
      rewardClaimsCount > 0;

    if (!hasHistoricalData) {
      await prisma.loyaltyProgram.delete({ where: { id: programId } });
      return NextResponse.json({ success: true, action: "deleted" });
    }

    const cardsToExpire = await prisma.loyaltyCard.findMany({
      where: {
        programId,
        status: { notIn: ["EXPIRED", "REVOKED"] },
      },
      select: { id: true },
    });

    await prisma.$transaction([
      prisma.loyaltyProgram.update({
        where: { id: programId },
        data: { isActive: false },
      }),
      prisma.loyaltyCard.updateMany({
        where: {
          programId,
          status: { notIn: ["EXPIRED", "REVOKED"] },
        },
        data: { status: "EXPIRED" },
      }),
    ]);

    void Promise.allSettled(
      cardsToExpire.map((card) => notifyPassUpdate(card.id))
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      action: "archived",
      expiredCards: cardsToExpire.length,
    });
  } catch (err) {
    console.error("Archive/delete program error:", err);
    return NextResponse.json(
      { error: "Erreur lors de l'archivage du programme" },
      { status: 500 }
    );
  }
}

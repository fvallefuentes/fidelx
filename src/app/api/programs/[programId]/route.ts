import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveLimits } from "@/lib/plan-limits";
import { notifyPassUpdate } from "@/lib/wallet/push";
import { getStampAreaInset, getStampAreaRadius } from "@/lib/wallet/stamp-icons";
import type { Prisma } from "@/generated/prisma/client";
import { getJoinFormRequirements } from "@/lib/join-form";

/* Modifier les informations et le design d'un programme existant. */
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
      type: true,
      cardDesign: true,
      config: true,
      rewards: {
        where: { isActive: true },
        select: { id: true, threshold: true },
        orderBy: { createdAt: "asc" },
      },
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
    maxStamps?: number;
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
      stampSpacing?: string;
      stampAreaInset?: number;
      stampAreaRadius?: number;
      stampBgType?: "none" | "color" | "image";
      stampBgColor?: string | null;
      stampBgColor2?: string | null;
      stampBgImage?: string | null;
      description?: string;
      proximityMessage?: string | null;
    };
    establishmentId?: string | null;
    joinForm?: {
      emailRequired?: boolean;
      phoneRequired?: boolean;
      birthDateRequired?: boolean;
    };
  };

  // Gating : logo personnalisé réservé aux plans payants
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true, trialEndsAt: true, manualPlanUntil: true, testMode: true },
  });
  const limits = getEffectiveLimits(user);
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
  const currentConfig = (program.config as Record<string, unknown>) ?? {};
  let nextMaxStamps: number | undefined;
  if (body.maxStamps !== undefined) {
    if (program.type !== "STAMPS") {
      return NextResponse.json(
        { error: "Le nombre de tampons ne concerne que les programmes à tampons." },
        { status: 400 }
      );
    }
    if (
      !Number.isInteger(body.maxStamps) ||
      body.maxStamps < 1 ||
      body.maxStamps > 20
    ) {
      return NextResponse.json(
        { error: "Le nombre de tampons doit être compris entre 1 et 20." },
        { status: 400 }
      );
    }
    nextMaxStamps = body.maxStamps;
  }
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
    if (body.cardDesign.proximityMessage === null) {
      delete nextDesign.proximityMessage;
    } else if (typeof body.cardDesign.proximityMessage === "string") {
      const proximityMessage = body.cardDesign.proximityMessage.trim().slice(0, 90);
      if (proximityMessage) {
        nextDesign.proximityMessage = proximityMessage;
      } else {
        delete nextDesign.proximityMessage;
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
      if (typeof body.cardDesign.stampSpacing === "string") {
        nextDesign.stampSpacing = body.cardDesign.stampSpacing;
      }
      if (typeof body.cardDesign.stampAreaInset === "number") {
        nextDesign.stampAreaInset = getStampAreaInset(
          body.cardDesign.stampAreaInset
        );
      }
      if (typeof body.cardDesign.stampAreaRadius === "number") {
        nextDesign.stampAreaRadius = getStampAreaRadius(
          body.cardDesign.stampAreaRadius
        );
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

  const nextConfig = {
    ...currentConfig,
    ...(nextMaxStamps !== undefined ? { maxStamps: nextMaxStamps } : {}),
    ...(body.joinForm
      ? { joinForm: getJoinFormRequirements({ joinForm: body.joinForm }) }
      : {}),
  };

  const updated = await prisma.$transaction(async (tx) => {
    const nextProgram = await tx.loyaltyProgram.update({
      where: { id: programId },
      data: {
        name:
          typeof body.name === "string" && body.name.trim()
            ? body.name.trim()
            : program.name,
        cardDesign: nextDesign as Prisma.InputJsonValue,
        ...(establishmentUpdate !== undefined
          ? { establishmentId: establishmentUpdate }
          : {}),
        ...(nextMaxStamps !== undefined || body.joinForm
          ? { config: nextConfig as Prisma.InputJsonValue }
          : {}),
      },
      select: {
        id: true,
        name: true,
        cardDesign: true,
        config: true,
      },
    });

    if (nextMaxStamps !== undefined) {
      const previousMaxStamps =
        typeof currentConfig.maxStamps === "number"
          ? currentConfig.maxStamps
          : 10;
      const rewardToUpdate =
        program.rewards.find((reward) => reward.threshold === previousMaxStamps) ??
        program.rewards[0];
      if (rewardToUpdate) {
        await tx.reward.update({
          where: { id: rewardToUpdate.id },
          data: { threshold: nextMaxStamps },
        });
      }
    }

    return nextProgram;
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

import { prisma } from "@/lib/prisma";

export const DEFAULT_CARD_OFFER_DAYS = 7;
export const MAX_CARD_OFFER_DAYS = 365;

export type ProgramCardOfferFields = {
  activeOfferCampaignId?: string | null;
  activeOfferTitle?: string | null;
  activeOfferMessage?: string | null;
  activeOfferStartsAt?: Date | null;
  activeOfferEndsAt?: Date | null;
};

export function resolveActiveCardOffer(
  program: ProgramCardOfferFields,
  now = new Date()
) {
  if (
    !program.activeOfferCampaignId ||
    !program.activeOfferMessage ||
    !program.activeOfferStartsAt ||
    !program.activeOfferEndsAt ||
    program.activeOfferStartsAt > now ||
    program.activeOfferEndsAt <= now
  ) {
    return null;
  }

  return {
    campaignId: program.activeOfferCampaignId,
    title: program.activeOfferTitle || "Offre en cours",
    message: program.activeOfferMessage,
    startsAt: program.activeOfferStartsAt,
    endsAt: program.activeOfferEndsAt,
  };
}

export function resolveVisibleCardOffer(input: {
  program: ProgramCardOfferFields;
  lastMessage?: string | null;
  lastMessageExpiresAt?: Date | null;
  now?: Date;
}) {
  const now = input.now || new Date();
  const activeOffer = resolveActiveCardOffer(input.program, now);
  if (activeOffer) return activeOffer.message;

  if (input.lastMessageExpiresAt && input.lastMessageExpiresAt <= now) {
    return null;
  }

  return input.lastMessage || null;
}

export function offerIntervalsOverlap(
  first: { startsAt: Date; endsAt: Date },
  second: { startsAt: Date; endsAt: Date }
) {
  return first.startsAt < second.endsAt && second.startsAt < first.endsAt;
}

export async function activateProgramCardOffer(input: {
  merchantId: string;
  programId: string;
  campaignId: string;
  title: string;
  message: string;
  startsAt: Date;
  endsAt: Date;
}) {
  return prisma.$transaction(async (tx) => {
    const program = await tx.loyaltyProgram.findFirst({
      where: { id: input.programId, merchantId: input.merchantId },
      select: { activeOfferCampaignId: true },
    });
    if (!program) return { count: 0 };

    if (
      program.activeOfferCampaignId &&
      program.activeOfferCampaignId !== input.campaignId
    ) {
      await tx.notificationCampaign.updateMany({
        where: { id: program.activeOfferCampaignId },
        data: { offerEndsAt: input.startsAt },
      });
    }

    return tx.loyaltyProgram.updateMany({
      where: { id: input.programId, merchantId: input.merchantId },
      data: {
        activeOfferCampaignId: input.campaignId,
        activeOfferTitle: input.title,
        activeOfferMessage: input.message,
        activeOfferStartsAt: input.startsAt,
        activeOfferEndsAt: input.endsAt,
      },
    });
  });
}

export async function expireProgramCardOffers(now = new Date()) {
  const expiredPrograms = await prisma.loyaltyProgram.findMany({
    where: {
      activeOfferCampaignId: { not: null },
      activeOfferEndsAt: { lte: now },
    },
    select: { id: true },
    take: 20,
  });

  const expired: Array<{ programId: string; cardIds: string[] }> = [];

  for (const program of expiredPrograms) {
    const cardIds = await prisma.$transaction(async (tx) => {
      const cleared = await tx.loyaltyProgram.updateMany({
        where: {
          id: program.id,
          activeOfferCampaignId: { not: null },
          activeOfferEndsAt: { lte: now },
        },
        data: {
          activeOfferCampaignId: null,
          activeOfferTitle: null,
          activeOfferMessage: null,
          activeOfferStartsAt: null,
          activeOfferEndsAt: null,
        },
      });
      if (cleared.count === 0) return [];

      const cards = await tx.loyaltyCard.findMany({
        where: { programId: program.id },
        select: { id: true },
      });
      await tx.loyaltyCard.updateMany({
        where: {
          programId: program.id,
          lastMessageExpiresAt: { lte: now },
        },
        data: {
          lastMessage: null,
          lastMessageExpiresAt: null,
        },
      });
      return cards.map((card) => card.id);
    });

    if (cardIds.length > 0) expired.push({ programId: program.id, cardIds });
  }

  return expired;
}

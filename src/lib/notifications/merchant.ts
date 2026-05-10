import { prisma } from "@/lib/prisma";
import type { MerchantNotificationType } from "@/generated/prisma/enums";

/**
 * Crée une notification in-app pour le commerçant.
 *
 * Fire-and-forget : ne throw jamais, ne bloque jamais le caller.
 * Utilisé dans tous les handlers métier (join, claim-reward, cron…).
 */
export async function createMerchantNotification(input: {
  merchantId: string;
  type: MerchantNotificationType;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
  /** Si défini, ne crée pas la notif si une notif identique (merchantId+type+key)
   *  existe dans la fenêtre dedupeMinutes (anti-bruit). */
  dedupeKey?: string;
  dedupeMinutes?: number;
}): Promise<void> {
  try {
    if (input.dedupeKey && input.dedupeMinutes) {
      const since = new Date(Date.now() - input.dedupeMinutes * 60_000);
      const existing = await prisma.merchantNotification.findFirst({
        where: {
          merchantId: input.merchantId,
          type: input.type,
          createdAt: { gte: since },
          metadata: { path: ["dedupeKey"], equals: input.dedupeKey },
        },
        select: { id: true },
      });
      if (existing) return;
    }

    await prisma.merchantNotification.create({
      data: {
        merchantId: input.merchantId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
        metadata: input.metadata
          ? {
              ...input.metadata,
              ...(input.dedupeKey ? { dedupeKey: input.dedupeKey } : {}),
            }
          : input.dedupeKey
          ? { dedupeKey: input.dedupeKey }
          : undefined,
      },
    });
  } catch (err) {
    console.error(
      "[merchantNotification.create] failed:",
      (err as Error).message
    );
  }
}

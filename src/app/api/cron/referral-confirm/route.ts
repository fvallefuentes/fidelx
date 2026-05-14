import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { requireCronSecret } from "@/lib/api/validation";
import { createMerchantNotification } from "@/lib/notifications/merchant";
import {
  MAX_MONTHS_CUMULATIVE,
  SAFETY_WINDOW_DAYS,
} from "@/lib/referral/merchant";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/cron/referral-confirm
 *
 * Cron quotidien (recommandé : 03:00 UTC). À appeler avec :
 *
 *   0 3 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
 *       https://www.fidlify.com/api/cron/referral-confirm >/dev/null
 *
 * Pour chaque MerchantReferralAttribution :
 *  - status = PENDING
 *  - confirmedAt IS NOT NULL (= filleul a payé sa 1ère facture)
 *  - confirmedAt < now - 14j (safety window contre refund)
 *
 * On applique le crédit aux deux parties (parrain + filleul) :
 *  - 1 mois gratuit = `trial_end` décalé de 30 jours après le current_period_end
 *  - Cap parrain : max 12 mois cumulés (`monthsEarnedTotal`)
 *  - Filleul : toujours crédité (pas de cap)
 *
 * Notifications envoyées au parrain à chaque conversion confirmée.
 */
export async function GET(req: Request) {
  const cronAuthError = requireCronSecret(req);
  if (cronAuthError) return cronAuthError;

  const cutoff = new Date(Date.now() - SAFETY_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const attributions = await prisma.merchantReferralAttribution.findMany({
    where: {
      status: "PENDING",
      confirmedAt: { lt: cutoff, not: null },
      referrerCreditApplied: false,
      refereeCreditApplied: false,
    },
    include: {
      referee: {
        select: {
          id: true,
          email: true,
          stripeSubscriptionId: true,
          plan: true,
        },
      },
      link: {
        select: {
          id: true,
          merchantId: true,
          monthsEarnedTotal: true,
          merchant: {
            select: {
              id: true,
              email: true,
              stripeSubscriptionId: true,
              plan: true,
            },
          },
        },
      },
    },
    take: 50, // garde-fou
  });

  const stripe = getStripe();
  let processed = 0;
  let creditedReferrers = 0;
  let creditedReferees = 0;
  let skipped = 0;
  const errors: { id: string; message: string }[] = [];

  for (const attr of attributions) {
    try {
      const referee = attr.referee;
      const link = attr.link;
      const referrer = link.merchant;

      // ── Anti-fraude : self-referral via IP/fingerprint
      // (re-check ici car parrain et filleul peuvent avoir partagé un device).
      // Pour l'instant on se contente du flag stocké au register.

      // ── Crédit filleul (toujours, pas de cap)
      let refereeApplied = false;
      if (referee.stripeSubscriptionId) {
        const ok = await extendTrialBy30Days(
          stripe,
          referee.stripeSubscriptionId,
          `Fidlify referral — filleul: ${attr.id}`
        );
        refereeApplied = ok;
        if (ok) creditedReferees++;
      } else {
        console.warn(
          `[referral-cron] referee ${referee.id} has no active subscription, credit skipped`
        );
      }

      // ── Crédit parrain (cap 12 mois)
      let referrerApplied = false;
      const capReached = link.monthsEarnedTotal >= MAX_MONTHS_CUMULATIVE;
      if (capReached) {
        console.log(
          `[referral-cron] referrer ${referrer.id} reached cap ${MAX_MONTHS_CUMULATIVE} months — skip credit`
        );
      } else if (referrer.stripeSubscriptionId) {
        const ok = await extendTrialBy30Days(
          stripe,
          referrer.stripeSubscriptionId,
          `Fidlify referral — parrain: ${attr.id}`
        );
        referrerApplied = ok;
        if (ok) creditedReferrers++;
      } else {
        // Le parrain n'a pas (ou plus) d'abonnement actif. On marque l'attribution
        // comme confirmée pour les stats, mais le crédit reste à appliquer
        // manuellement quand il souscrit (TODO phase ultérieure : pending balance).
        console.warn(
          `[referral-cron] referrer ${referrer.id} has no active subscription, credit deferred`
        );
      }

      // ── Update DB : marque confirmé même si un seul côté crédité, pour
      // la lisibilité dashboard. monthsEarnedTotal ne bouge que si le parrain
      // a effectivement été crédité (sinon on garde la capacité de re-tenter).
      await prisma.merchantReferralAttribution.update({
        where: { id: attr.id },
        data: {
          status: "CONFIRMED",
          referrerCreditApplied: referrerApplied,
          refereeCreditApplied: refereeApplied,
        },
      });

      if (referrerApplied) {
        await prisma.merchantReferralLink.update({
          where: { id: link.id },
          data: {
            monthsEarnedTotal: { increment: 1 },
            conversions: { increment: 1 },
          },
        });
      } else if (refereeApplied) {
        // Crédit filleul appliqué mais pas parrain : on compte tout de même la
        // conversion (le funnel a abouti, le crédit parrain est juste différé).
        await prisma.merchantReferralLink.update({
          where: { id: link.id },
          data: { conversions: { increment: 1 } },
        });
      }

      // ── Notif in-app au parrain
      if (referrerApplied || refereeApplied) {
        try {
          await createMerchantNotification({
            merchantId: referrer.id,
            type: "REFERRAL_CONFIRMED",
            title: "Parrainage confirmé",
            body: referrerApplied
              ? `Ton filleul vient de payer sa 1ère facture. +1 mois ${attr.refereePlan ?? ""} offert sur ton abonnement.`
              : `Ton filleul a payé sa 1ère facture. Souscris à un plan pour recevoir ton mois offert.`,
            link: "/dashboard/parrainage",
          });
        } catch (e) {
          console.error("[referral-cron] notif failed:", e);
        }
      }

      processed++;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`[referral-cron] error on attribution ${attr.id}:`, message);
      errors.push({ id: attr.id, message });
      skipped++;
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: attributions.length,
    processed,
    creditedReferrers,
    creditedReferees,
    skipped,
    errors,
  });
}

/**
 * Étend le trial_end d'une subscription Stripe de 30 jours après la fin
 * de la période courante. Effet net : la prochaine facture est décalée
 * de 30j → équivalent à "1 mois gratuit".
 *
 * Note : Stripe basil expose current_period_end via plusieurs chemins
 * selon la version d'API. On gère les deux.
 */
async function extendTrialBy30Days(
  stripe: ReturnType<typeof getStripe>,
  subscriptionId: string,
  reason: string
): Promise<boolean> {
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = sub as any;
    const currentPeriodEnd: number | undefined =
      raw.current_period_end ??
      raw.billing?.billing_cycle?.current_period_end ??
      sub.items?.data?.[0]?.current_period_end;

    if (!currentPeriodEnd || typeof currentPeriodEnd !== "number") {
      console.error(
        `[referral-cron] cannot read current_period_end for sub ${subscriptionId}`
      );
      return false;
    }

    const newTrialEnd = currentPeriodEnd + 30 * 24 * 60 * 60;

    await stripe.subscriptions.update(subscriptionId, {
      trial_end: newTrialEnd,
      proration_behavior: "none",
      metadata: { fidlify_referral_credit: reason },
    });
    return true;
  } catch (e) {
    console.error(
      `[referral-cron] extendTrialBy30Days failed for ${subscriptionId}:`,
      e
    );
    return false;
  }
}

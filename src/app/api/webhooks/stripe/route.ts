import { NextResponse } from "next/server";
import { getStripe, STRIPE_PLAN_CODE_MAP } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";
import { trackServerEvent, identifyServerUser } from "@/lib/analytics/posthog-server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotence — ignorer les events déjà traités
  const existing = await prisma.stripeEvent.findUnique({ where: { id: event.id } });
  if (existing) {
    return NextResponse.json({ received: true, skipped: true });
  }

  try {
    await handleEvent(event);
    await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch (err) {
    console.error("[stripe webhook] error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpsert(sub);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(sub);
      break;
    }
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentSucceeded(invoice);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(invoice);
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      await handleChargeRefunded(charge);
      break;
    }
  }
}

async function handleSubscriptionUpsert(sub: Stripe.Subscription) {
  const customerId = sub.customer as string;
  const priceId = sub.items.data[0]?.price.id;
  const planCode = sub.items.data[0]?.price.product
    ? await getPlanCodeFromPrice(sub.items.data[0].price)
    : null;
  const plan = planCode ? STRIPE_PLAN_CODE_MAP[planCode] : null;
  // current_period_start/end déplacés dans l'API basil — accès sécurisé
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = sub as any;
  const rawStart = raw.current_period_start ?? raw.billing?.billing_cycle?.current_period_start;
  const rawEnd   = raw.current_period_end   ?? raw.billing?.billing_cycle?.current_period_end;
  const periodStart = rawStart ? new Date(rawStart * 1000) : null;
  const periodEnd   = rawEnd   ? new Date(rawEnd   * 1000) : null;

  // Capture l'ancien plan pour détecter upgrade/downgrade
  const before = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true, plan: true },
  });

  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId ?? null,
      stripeCurrentPeriodStart: periodStart ?? undefined,
      stripeCurrentPeriodEnd:   periodEnd   ?? undefined,
      ...(plan ? { plan: plan as never } : {}),
    },
  });

  // Analytics : track plan changes (upgrade / downgrade)
  if (before?.id && plan && plan !== before.plan) {
    const isUpgrade = planRank(plan) > planRank(before.plan);
    void trackServerEvent(before.id, isUpgrade ? "plan.upgraded" : "plan.downgraded", {
      from: before.plan,
      to: plan,
      priceId,
    });
    void identifyServerUser(before.id, { plan });
  }
}

function planRank(plan: string | null | undefined): number {
  const order: Record<string, number> = {
    FREE: 0,
    ESSENTIAL: 1,
    GROWTH: 2,
    MULTI_SITE: 3,
  };
  return order[plan ?? "FREE"] ?? 0;
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const customerId = sub.customer as string;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true, plan: true },
  });

  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      plan: "FREE",
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeCurrentPeriodEnd: null,
    },
  });

  if (user?.id) {
    void trackServerEvent(user.id, "plan.cancelled", { from: user.plan });
    void identifyServerUser(user.id, { plan: "FREE" });
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
  if (!user) return;

  // TODO: envoyer un email au commerçant
  console.warn(`[stripe] payment failed for user ${user.id} (${user.email})`);

  void trackServerEvent(user.id, "payment.failed", {
    invoiceId: invoice.id,
    amountDue: invoice.amount_due,
  });
}

/**
 * 1ère facture payée du filleul → marque l'attribution prête à confirmer.
 * Le crédit n'est PAS appliqué ici : un cron quotidien le fera après 14j
 * de safety window pour éviter de créditer avant un refund éventuel.
 *
 * Détection "1ère facture" : `billing_reason: 'subscription_create'` est
 * posé par Stripe sur la toute première facture d'un abonnement. Pour les
 * renouvellements ce champ vaut `subscription_cycle`.
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // On ne traite que les premières factures d'un nouvel abonnement.
  if (invoice.billing_reason !== "subscription_create") return;

  const customerId = invoice.customer as string;
  if (!customerId) return;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true, plan: true },
  });
  if (!user) return;

  const attribution = await prisma.merchantReferralAttribution.findUnique({
    where: { refereeId: user.id },
    select: { id: true, status: true },
  });
  if (!attribution || attribution.status !== "PENDING") return;

  // On enregistre la conversion "logique" mais on n'applique pas encore
  // les crédits Stripe — c'est le cron qui le fera après 14j.
  await prisma.merchantReferralAttribution.update({
    where: { id: attribution.id },
    data: {
      confirmedAt: new Date(),
      refereePlan: user.plan, // ESSENTIAL | GROWTH | MULTI_SITE
    },
  });
  console.log(
    `[referral] attribution ${attribution.id} → confirmedAt set (waiting safety window)`
  );
}

/**
 * Remboursement Stripe → si une attribution existe pour ce filleul et n'a
 * pas encore eu son crédit appliqué, on la révoque. Si le crédit a déjà
 * été appliqué (cas rare : refund > 14j après payment), on log et on
 * laisse l'admin gérer manuellement.
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  const customerId = charge.customer as string;
  if (!customerId) return;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  if (!user) return;

  const attribution = await prisma.merchantReferralAttribution.findUnique({
    where: { refereeId: user.id },
  });
  if (!attribution) return;

  if (
    attribution.referrerCreditApplied ||
    attribution.refereeCreditApplied
  ) {
    console.warn(
      `[referral] refund AFTER credit applied for ${attribution.id} — manual clawback required`
    );
    return;
  }

  await prisma.merchantReferralAttribution.update({
    where: { id: attribution.id },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      revokedReason: "REFUND",
    },
  });
  console.log(`[referral] attribution ${attribution.id} → REVOKED (refund)`);
}

async function getPlanCodeFromPrice(price: Stripe.Price): Promise<string | null> {
  if (price.metadata?.plan_code) return price.metadata.plan_code;

  // Si les metadata ne sont pas sur le Price, on les cherche sur le Product
  if (typeof price.product === "string") {
    const product = await getStripe().products.retrieve(price.product);
    return product.metadata?.plan_code ?? null;
  }
  return null;
}

import { NextResponse } from "next/server";
import { stripe, STRIPE_PLAN_CODE_MAP } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
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
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(invoice);
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
  const periodEnd = new Date(sub.current_period_end * 1000);

  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId ?? null,
      stripeCurrentPeriodEnd: periodEnd,
      ...(plan ? { plan: plan as never } : {}),
    },
  });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const customerId = sub.customer as string;

  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      plan: "FREE",
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeCurrentPeriodEnd: null,
    },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
  if (!user) return;

  // TODO: envoyer un email au commerçant
  console.warn(`[stripe] payment failed for user ${user.id} (${user.email})`);
}

async function getPlanCodeFromPrice(price: Stripe.Price): Promise<string | null> {
  if (price.metadata?.plan_code) return price.metadata.plan_code;

  // Si les metadata ne sont pas sur le Price, on les cherche sur le Product
  if (typeof price.product === "string") {
    const product = await stripe.products.retrieve(price.product);
    return product.metadata?.plan_code ?? null;
  }
  return null;
}

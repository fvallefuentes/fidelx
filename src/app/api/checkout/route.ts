import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

const PLAN_CODE_TO_STRIPE: Record<string, string> = {
  essential:  "essential",
  growth:     "growth",
  multi_site: "multi_sites",
};

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { searchParams } = new URL(req.url);
  const plan = searchParams.get("plan");

  if (!plan || !PLAN_CODE_TO_STRIPE[plan]) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const stripe = getStripe();
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.redirect(new URL("/dashboard", req.url));

  // Créer ou récupérer le customer Stripe
  let customerId = user.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      name: user.name ?? undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  // Trouver le prix via le plan_code du produit
  const planCode = PLAN_CODE_TO_STRIPE[plan];
  const products = await stripe.products.list({ active: true, limit: 20 });
  const product = products.data.find(
    (p) => p.metadata.plan_code === planCode || p.metadata.app_plan_id === planCode
  );

  if (!product) {
    console.error(`[checkout] No Stripe product found for plan_code=${planCode}`);
    return NextResponse.redirect(new URL("/dashboard?error=plan_not_found", req.url));
  }

  const prices = await stripe.prices.list({ product: product.id, active: true });
  const price = prices.data.find((p) => p.type === "recurring");

  if (!price) {
    console.error(`[checkout] No recurring price for product ${product.id}`);
    return NextResponse.redirect(new URL("/dashboard?error=price_not_found", req.url));
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: price.id, quantity: 1 }],
    success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/#pricing`,
    metadata: { userId: user.id, plan },
    subscription_data: {
      metadata: { userId: user.id, plan_code: planCode },
    },
  });

  return NextResponse.redirect(checkoutSession.url!);
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

/**
 * GET /api/billing-portal
 *
 * Crée une session Stripe Customer Portal pour l'utilisateur connecté et
 * redirige vers l'URL Stripe. Le portail permet au client de :
 *  - Annuler l'abonnement (par défaut : à la fin de la période courante)
 *  - Changer de plan
 *  - Mettre à jour sa carte bancaire
 *  - Télécharger ses factures
 *
 * La cancellation mode "à la fin de période" est configurable depuis Stripe
 * Dashboard → Settings → Billing → Customer portal. Par défaut Stripe garde
 * la subscription active jusqu'à current_period_end → l'utilisateur conserve
 * ses fonctionnalités payantes jusqu'à la date où il aurait été renouvelé.
 *
 * Erreur :
 *  - 401 si pas connecté
 *  - 404 si pas de stripeCustomerId (le user n'a jamais payé)
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    const settingsUrl = new URL("/dashboard/settings", req.url);
    settingsUrl.searchParams.set("billing", "manual");
    return NextResponse.redirect(settingsUrl);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl}/dashboard/settings`,
  });

  return NextResponse.redirect(portalSession.url);
}

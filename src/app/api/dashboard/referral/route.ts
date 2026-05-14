import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMerchantReferralStats } from "@/lib/referral/merchant";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard/referral
 *
 * Retourne le lien parrainage du merchant connecté + ses statistiques.
 * Crée le lien à la volée si pas encore existant (idempotent).
 *
 * Réservé aux merchants (role USER). STAFF/ADMIN → 403.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  if (user.role && user.role !== "USER") {
    return NextResponse.json(
      { error: "Parrainage réservé aux commerçants" },
      { status: 403 }
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://www.fidlify.com";

  try {
    const stats = await getMerchantReferralStats(user.id, appUrl);
    return NextResponse.json(stats);
  } catch (err) {
    console.error("[dashboard/referral] failed:", err);
    return NextResponse.json(
      { error: "Erreur lors du chargement du parrainage" },
      { status: 500 }
    );
  }
}

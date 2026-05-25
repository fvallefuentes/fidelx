import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listPendingReviews } from "@/lib/google-review";

export const dynamic = "force-dynamic";

/**
 * GET /api/merchants/reviews
 * Liste les demandes d'avis Google en attente de validation pour le
 * merchant connecté.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any;
  if (!user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  // STAFF agit pour le compte de son employeur ; merchantId résolu côté token
  const merchantId = user.merchantId || user.id;

  const reviews = await listPendingReviews(merchantId);
  return NextResponse.json({ reviews });
}

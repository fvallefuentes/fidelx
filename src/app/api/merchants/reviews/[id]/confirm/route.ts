import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { confirmReviewRequest } from "@/lib/google-review";

/**
 * POST /api/merchants/reviews/[id]/confirm
 * Valide une demande d'avis : crédite le bonus + met à jour le pass Wallet.
 */
export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any;
  if (!user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const merchantId = user.merchantId || user.id;
  const { id } = await context.params;

  const result = await confirmReviewRequest(id, merchantId);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rejectReviewRequest } from "@/lib/google-review";

/**
 * POST /api/merchants/reviews/[id]/reject
 * Rejette une demande d'avis (avis non trouvé sur Google).
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

  const result = await rejectReviewRequest(id, merchantId);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

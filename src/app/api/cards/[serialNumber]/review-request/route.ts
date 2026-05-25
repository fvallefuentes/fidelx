import { NextResponse } from "next/server";
import { createReviewRequest } from "@/lib/google-review";

/**
 * POST /api/cards/[serialNumber]/review-request
 *
 * Appelé quand le client clique "J'ai laissé un avis" sur /avis/[serialNumber].
 * Crée une GoogleReviewRequest (status SENT) en attente de validation merchant.
 *
 * Public (pas d'auth) — le serialNumber fait office de secret de capacité.
 */
export async function POST(
  _req: Request,
  context: { params: Promise<{ serialNumber: string }> }
) {
  const { serialNumber } = await context.params;
  const result = await createReviewRequest(serialNumber);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, reason: result.reason },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}

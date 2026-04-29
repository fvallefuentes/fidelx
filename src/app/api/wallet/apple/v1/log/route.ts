import { NextResponse } from "next/server";

/**
 * Apple Wallet — log endpoint (errors from iOS reporting issues with passes)
 * POST /api/wallet/apple/v1/log
 * Body: { "logs": ["...", "..."] }
 *
 * Apple appelle cet endpoint quand iOS rencontre un problème avec un
 * de nos passes (pass invalide, signature ratée, etc). On le log côté
 * serveur pour debug.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (Array.isArray(body?.logs)) {
      for (const line of body.logs) {
        console.log("[wallet/apple/log]", line);
      }
    }
  } catch {
    // ignore — les logs Apple ne sont pas critiques
  }
  return new NextResponse(null, { status: 200 });
}

import { NextResponse } from "next/server";

/**
 * Route de test Sentry serveur — lance une erreur volontaire.
 * À utiliser depuis /sentry-example-page pour vérifier que les erreurs
 * API remontent bien dans le dashboard Sentry.
 */
export async function POST() {
  throw new Error("Sentry test — server error from /api/sentry-example");
  // eslint-disable-next-line @typescript-eslint/no-unreachable-code
  return NextResponse.json({ ok: true });
}

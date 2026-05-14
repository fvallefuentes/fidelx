import { NextResponse } from "next/server";
import {
  buildReferralCookieHeader,
  trackReferralClick,
} from "@/lib/referral/merchant";

/**
 * Point d'entrée des liens parrainage merchant : `/r/{code}`.
 *
 * - Increment atomique du compteur clicks (si code valide).
 * - Pose le cookie `fidlify_mref` (30j) qui sera lu au /register.
 * - Redirige vers /register en propageant `?ref={code}` pour visibilité UX.
 *
 * Codes inconnus : redirection silencieuse vers /register (pas de 404 pour
 * éviter de leak l'existence d'un code).
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const cleanCode = code.trim().toLowerCase();

  // Tracking (async, ne bloque pas la redirection en cas d'erreur DB)
  const link = await trackReferralClick(cleanCode);

  const target = new URL("/register", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
  if (link) {
    target.searchParams.set("ref", cleanCode);
  }

  const res = NextResponse.redirect(target, { status: 302 });
  if (link) {
    res.headers.append("Set-Cookie", buildReferralCookieHeader(cleanCode));
  }
  return res;
}

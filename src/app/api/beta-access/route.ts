import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

/**
 * POST /api/beta-access — Vérifie le mot de passe et pose le cookie d'accès.
 *
 * Si BETA_ACCESS_PASSWORD n'est pas défini en env, retourne 200 sans rien
 * faire (le middleware ne gatera rien non plus).
 *
 * Cookie : fidlify_beta_ok=1
 *   - httpOnly : pas accessible JS (limite XSS)
 *   - Secure : HTTPS uniquement
 *   - SameSite=Strict : pas envoyé sur requêtes cross-site
 *   - Max-Age 30 jours
 */

const COOKIE_NAME = "fidlify_beta_ok";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 jours

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(req: Request) {
  const expected = process.env.BETA_ACCESS_PASSWORD;

  // Si pas de password configuré → gate désactivée, on retourne ok
  if (!expected) {
    return NextResponse.json({ ok: true, gateDisabled: true });
  }

  let password = "";
  try {
    const body = await req.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    /* invalid JSON */
  }

  if (!password) {
    return NextResponse.json(
      { error: "Mot de passe requis" },
      { status: 400 }
    );
  }

  // Délai random 100-300ms pour limiter le timing-side-channel
  await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));

  if (!safeEqual(password, expected)) {
    return NextResponse.json(
      { error: "Mot de passe incorrect" },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE_NAME,
    value: "1",
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}

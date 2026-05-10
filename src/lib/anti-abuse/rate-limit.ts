import { prisma } from "@/lib/prisma";
import type { JoinResult } from "@/generated/prisma/enums";

/**
 * Rate limiting par fenêtre glissante, basé sur la table JoinAttempt.
 * Pas de Redis requis — Postgres suffit largement pour le volume d'inscription
 * (quelques centaines par jour max au début).
 *
 * Stratégie : pour chaque dimension (IP, email, phone, cookie), on compte
 * les SUCCESS dans une fenêtre. Les attempts échoués ne comptent pas pour
 * le rate limit (sinon un attacker pourrait spammer du faux pour bloquer
 * un legitimate user).
 */

export type RateLimitRule = {
  /** Nom lisible (pour logging). */
  name: string;
  /** Fenêtre en millisecondes. */
  windowMs: number;
  /** Nombre max de SUCCESS dans la fenêtre. */
  max: number;
};

export type RateLimitInput = {
  programId: string;
  ipPrefix: string | null;
  email: string | null;
  phone: string | null;
  deviceCookie: string | null;
  fingerprint: string | null;
};

export type RateLimitVerdict =
  | { ok: true }
  | { ok: false; rule: string; retryAfterSeconds: number };

/**
 * Règles par défaut. Tunables sans recompil — on peut les exposer via env si besoin.
 *
 * Logique :
 * - IP : 3 cartes / 15 min sur le même programme (cas du flot normal en boutique
 *   où plusieurs clients passent par le même Wi-Fi)
 * - email : 1 carte / 24h / programme (anti-doublon, déjà couvert par dedup mais
 *   limite les retry abusifs)
 * - phone : idem
 * - cookie : 3 cartes / 24h tous programmes confondus (un même appareil ne devrait
 *   pas légitimement inscrire 10 personnes différentes en 1 jour)
 * - fingerprint : 5 cartes / 24h tous programmes (filet de sécurité si cookie effacé)
 * - IP global : 20 cartes / 1h tous programmes (anti-bot agressif)
 */
const RULES: Record<keyof Omit<RateLimitInput, "programId">, RateLimitRule[]> = {
  ipPrefix: [
    { name: "ip-program-15min", windowMs: 15 * 60_000, max: 3 },
    { name: "ip-global-1h", windowMs: 60 * 60_000, max: 20 },
  ],
  email: [{ name: "email-program-24h", windowMs: 24 * 60 * 60_000, max: 1 }],
  phone: [{ name: "phone-program-24h", windowMs: 24 * 60 * 60_000, max: 1 }],
  deviceCookie: [{ name: "cookie-global-24h", windowMs: 24 * 60 * 60_000, max: 3 }],
  fingerprint: [{ name: "fp-global-24h", windowMs: 24 * 60 * 60_000, max: 5 }],
};

/**
 * Évalue toutes les règles et retourne le premier blocage rencontré (ou ok).
 * Compte uniquement les attempts SUCCESS (pas les échecs).
 */
export async function evaluateRateLimits(
  input: RateLimitInput
): Promise<RateLimitVerdict> {
  const checks: Array<{
    rule: RateLimitRule;
    where: Record<string, unknown>;
  }> = [];

  // ipPrefix : par programme (15 min) ET global (1h)
  if (input.ipPrefix) {
    for (const rule of RULES.ipPrefix) {
      const isPerProgram = rule.name.includes("program");
      checks.push({
        rule,
        where: {
          ipPrefix: input.ipPrefix,
          ...(isPerProgram ? { programId: input.programId } : {}),
          createdAt: { gte: new Date(Date.now() - rule.windowMs) },
          result: "SUCCESS" satisfies JoinResult,
        },
      });
    }
  }

  // email : par programme uniquement
  if (input.email) {
    for (const rule of RULES.email) {
      checks.push({
        rule,
        where: {
          email: input.email,
          programId: input.programId,
          createdAt: { gte: new Date(Date.now() - rule.windowMs) },
          result: "SUCCESS" satisfies JoinResult,
        },
      });
    }
  }

  // phone : par programme uniquement
  if (input.phone) {
    for (const rule of RULES.phone) {
      checks.push({
        rule,
        where: {
          phone: input.phone,
          programId: input.programId,
          createdAt: { gte: new Date(Date.now() - rule.windowMs) },
          result: "SUCCESS" satisfies JoinResult,
        },
      });
    }
  }

  // deviceCookie : global, tous programmes
  if (input.deviceCookie) {
    for (const rule of RULES.deviceCookie) {
      checks.push({
        rule,
        where: {
          deviceCookie: input.deviceCookie,
          createdAt: { gte: new Date(Date.now() - rule.windowMs) },
          result: "SUCCESS" satisfies JoinResult,
        },
      });
    }
  }

  // fingerprint : global, tous programmes
  if (input.fingerprint) {
    for (const rule of RULES.fingerprint) {
      checks.push({
        rule,
        where: {
          fingerprint: input.fingerprint,
          createdAt: { gte: new Date(Date.now() - rule.windowMs) },
          result: "SUCCESS" satisfies JoinResult,
        },
      });
    }
  }

  // Exécute tous les counts en parallèle pour la perf
  const results = await Promise.all(
    checks.map((c) =>
      prisma.joinAttempt.count({ where: c.where })
    )
  );

  for (let i = 0; i < checks.length; i++) {
    const count = results[i];
    const { rule } = checks[i];
    if (count >= rule.max) {
      return {
        ok: false,
        rule: rule.name,
        retryAfterSeconds: Math.ceil(rule.windowMs / 1000),
      };
    }
  }

  return { ok: true };
}

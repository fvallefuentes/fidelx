/**
 * 2FA TOTP (Time-based One-Time Password, RFC 6238).
 *
 * Compatible Google Authenticator, 1Password, Authy, Bitwarden, etc.
 * Stockage minimal côté DB : secret base32 + backup codes hashés (sha256).
 *
 * Flow d'activation :
 *  1. /api/auth/totp/setup → génère secret + URL otpauth + 10 backup codes
 *  2. Le user scanne le QR avec son app, entre un code TOTP pour vérifier
 *  3. /api/auth/totp/enable avec le code → on persiste totpSecret + backup
 *     codes hashés + totpEnabled=true
 *  4. À chaque login, NextAuth Credentials exige le code TOTP en plus du
 *     password (ou un backup code à usage unique)
 */
import { generateSecret, generateURI, verify } from "otplib";
import { createHash, randomBytes } from "crypto";

/** Application name affiché dans l'app TOTP (ex: "Fidlify (admin@fidlify.com)"). */
const ISSUER = "Fidlify";

/**
 * Génère un nouveau secret TOTP base32 (160 bits par défaut).
 * À montrer une seule fois au user pendant le setup, puis à stocker côté DB.
 */
export function generateTotpSecret(): string {
  return generateSecret({ length: 20 });
}

/**
 * Construit l'URL otpauth:// que l'app TOTP scanne via QR code.
 * Format standard : `otpauth://totp/Fidlify:user@x.com?secret=XXX&issuer=Fidlify`
 */
export function buildOtpAuthUrl(email: string, secret: string): string {
  return generateURI({
    issuer: ISSUER,
    label: email,
    secret,
  });
}

/**
 * Vérifie un code TOTP 6 chiffres en fonction du secret.
 * epochTolerance ±30s couvre le léger drift d'horloge entre device et serveur
 * (= acceptation de la fenêtre précédente + la courante + la suivante).
 */
export async function verifyTotpCode(
  secret: string,
  code: string
): Promise<boolean> {
  if (!secret || !code) return false;
  // Normalisation : enlever espaces et caractères non-numériques
  const normalized = code.replace(/\s+/g, "").replace(/\D/g, "");
  if (normalized.length !== 6) return false;
  try {
    const result = await verify({
      secret,
      token: normalized,
      epochTolerance: 30,
    });
    return result.valid === true;
  } catch {
    return false;
  }
}

/* ============================================================
 * BACKUP CODES
 * ============================================================ */

const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 10; // 10 chars base32 = 50 bits entropy

/**
 * Génère N backup codes lisibles + leurs hashes sha256.
 * Les codes en clair sont à montrer UNE seule fois au user (à imprimer/sauver).
 * Seuls les hashes sont persistés en DB → si la DB leak, les codes ne sont pas
 * utilisables directement.
 *
 * Format code : "ABCD-EFGH-12" (3 segments séparés par tirets, base32 sans
 * caractères ambigus).
 */
export function generateBackupCodes(): {
  plainCodes: string[];
  hashedCodes: string[];
} {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans I, O, 0, 1
  const plainCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const bytes = randomBytes(BACKUP_CODE_LENGTH);
    let raw = "";
    for (let j = 0; j < BACKUP_CODE_LENGTH; j++) {
      raw += alphabet[bytes[j] % alphabet.length];
    }
    // Format : XXXX-XXXX-XX
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 10)}`;
    plainCodes.push(formatted);
    hashedCodes.push(hashBackupCode(formatted));
  }

  return { plainCodes, hashedCodes };
}

/** Hash sha256 d'un code (normalisé en uppercase, tirets retirés). */
export function hashBackupCode(code: string): string {
  const normalized = code.replace(/[-\s]/g, "").toUpperCase();
  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Vérifie qu'un code de backup correspond à l'un des hashes stockés.
 * Retourne le hash matché (à retirer du tableau côté caller) ou null.
 */
export function findMatchingBackupHash(
  storedHashes: string[],
  code: string
): string | null {
  const normalized = code.replace(/[-\s]/g, "").toUpperCase();
  if (normalized.length !== 10) return null;
  const candidateHash = createHash("sha256").update(normalized).digest("hex");
  return storedHashes.includes(candidateHash) ? candidateHash : null;
}

/* ============================================================
 * CONSTANTS EXPORTS
 * ============================================================ */

export const TOTP_BACKUP_CODE_COUNT = BACKUP_CODE_COUNT;

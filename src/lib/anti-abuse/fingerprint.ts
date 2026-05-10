import { createHash, randomUUID } from "crypto";

/**
 * Extraction et anonymisation des signaux d'identification serveur-side.
 * Pas de fingerprinting JS lourd (FingerprintJS, etc.) — privacy-friendly.
 */

const DEVICE_COOKIE_NAME = "fid_dev";

/** Anonymise une IP (IPv4 /24, IPv6 /48). Conforme nLPD/RGPD. */
export function anonymizeIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const trimmed = ip.trim();
  if (!trimmed) return null;

  // IPv6
  if (trimmed.includes(":")) {
    const parts = trimmed.split(":");
    return parts.slice(0, 3).join(":") + "::/48";
  }
  // IPv4
  const parts = trimmed.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  }
  return trimmed;
}

/** Récupère l'IP du visiteur depuis les headers (proxy-aware). */
export function extractIp(req: Request): string | null {
  const headers = req.headers;
  // Standard reverse proxy chains
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return (
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    null
  );
}

/** Hash léger : UA + IP/24 + Accept-Language → empreinte stable par "device + réseau". */
export function computeFingerprint({
  userAgent,
  ipPrefix,
  acceptLanguage,
}: {
  userAgent: string | null;
  ipPrefix: string | null;
  acceptLanguage: string | null;
}): string | null {
  if (!userAgent && !ipPrefix && !acceptLanguage) return null;
  const raw = `${userAgent || ""}|${ipPrefix || ""}|${acceptLanguage || ""}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

export type RequestContext = {
  ipPrefix: string | null;
  userAgent: string | null;
  acceptLanguage: string | null;
  deviceCookie: string | null;
  fingerprint: string | null;
};

/**
 * Extrait tout le contexte d'identification d'une Request en une fois.
 * Prend la valeur du cookie fid_dev s'il existe, sinon null (sera créé
 * dans la réponse via setDeviceCookie()).
 */
export function extractContext(req: Request): RequestContext {
  const ip = extractIp(req);
  const ipPrefix = anonymizeIp(ip);
  const userAgent = req.headers.get("user-agent");
  const acceptLanguage = req.headers.get("accept-language");

  // Lire le cookie fid_dev
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${DEVICE_COOKIE_NAME}=([a-f0-9-]{36})`)
  );
  const deviceCookie = match ? match[1] : null;

  const fingerprint = computeFingerprint({
    userAgent,
    ipPrefix,
    acceptLanguage,
  });

  return { ipPrefix, userAgent, acceptLanguage, deviceCookie, fingerprint };
}

/** Génère un nouveau UUID pour le cookie device. */
export function newDeviceCookieValue(): string {
  return randomUUID();
}

/** Construit l'en-tête Set-Cookie pour le cookie device (1 an, httpOnly). */
export function buildDeviceCookieHeader(value: string): string {
  return `${DEVICE_COOKIE_NAME}=${value}; Path=/; Max-Age=${60 * 60 * 24 * 365}; HttpOnly; SameSite=Lax; Secure`;
}

export { DEVICE_COOKIE_NAME };

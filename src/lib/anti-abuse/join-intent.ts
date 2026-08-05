import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const JOIN_INTENT_TTL_SECONDS = 15 * 60;

export type JoinIntentScope = "program" | "merchant";

type JoinIntentPayload = {
  version: 1;
  scope: JoinIntentScope;
  targetId: string;
  deviceCookie: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

export type JoinIntentVerdict =
  | { ok: true; payload: JoinIntentPayload }
  | {
      ok: false;
      reason:
        | "missing"
        | "malformed"
        | "invalid_signature"
        | "expired"
        | "wrong_target"
        | "wrong_device";
    };

function getSigningSecret(): string {
  const secret = process.env.JOIN_INTENT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      "JOIN_INTENT_SECRET or NEXTAUTH_SECRET must be configured to sign join intents"
    );
  }
  return secret;
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", getSigningSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export function createJoinIntent({
  scope,
  targetId,
  deviceCookie,
  now = Date.now(),
}: {
  scope: JoinIntentScope;
  targetId: string;
  deviceCookie: string;
  now?: number;
}): string {
  const payload: JoinIntentPayload = {
    version: 1,
    scope,
    targetId,
    deviceCookie,
    issuedAt: now,
    expiresAt: now + JOIN_INTENT_TTL_SECONDS * 1000,
    nonce: randomBytes(12).toString("base64url"),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url"
  );
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyJoinIntent({
  token,
  scope,
  targetId,
  deviceCookie,
  now = Date.now(),
}: {
  token: string | null | undefined;
  scope: JoinIntentScope;
  targetId: string;
  deviceCookie: string;
  now?: number;
}): JoinIntentVerdict {
  if (!token) return { ok: false, reason: "missing" };

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, reason: "malformed" };
  }

  const [encodedPayload, providedSignature] = parts;
  const expectedSignature = sign(encodedPayload);
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return { ok: false, reason: "invalid_signature" };
  }

  let payload: JoinIntentPayload;
  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as JoinIntentPayload;
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (
    payload.version !== 1 ||
    typeof payload.issuedAt !== "number" ||
    typeof payload.expiresAt !== "number" ||
    typeof payload.nonce !== "string"
  ) {
    return { ok: false, reason: "malformed" };
  }
  if (payload.scope !== scope || payload.targetId !== targetId) {
    return { ok: false, reason: "wrong_target" };
  }
  if (payload.deviceCookie !== deviceCookie) {
    return { ok: false, reason: "wrong_device" };
  }
  if (payload.issuedAt > now + 60_000 || payload.expiresAt <= now) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, payload };
}

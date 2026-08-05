import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildDeviceCookieHeader,
  extractContext,
  newDeviceCookieValue,
} from "@/lib/anti-abuse/fingerprint";
import {
  createJoinIntent,
  JOIN_INTENT_TTL_SECONDS,
  type JoinIntentScope,
} from "@/lib/anti-abuse/join-intent";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") as JoinIntentScope | null;
  const targetId = searchParams.get("targetId")?.trim();

  if ((scope !== "program" && scope !== "merchant") || !targetId) {
    return NextResponse.json({ error: "Cible invalide" }, { status: 400 });
  }

  const targetExists =
    scope === "program"
      ? await prisma.loyaltyProgram.findFirst({
          where: { id: targetId, isActive: true },
          select: { id: true },
        })
      : await prisma.user.findFirst({
          where: {
            id: targetId,
            suspendedAt: null,
            programs: { some: { isActive: true } },
          },
          select: { id: true },
        });

  if (!targetExists) {
    return NextResponse.json({ error: "Cible introuvable" }, { status: 404 });
  }

  const ctx = extractContext(req);
  const deviceCookie = ctx.deviceCookie ?? newDeviceCookieValue();
  const token = createJoinIntent({ scope, targetId, deviceCookie });
  const headers = new Headers({ "Cache-Control": "no-store" });
  if (!ctx.deviceCookie) {
    headers.set("Set-Cookie", buildDeviceCookieHeader(deviceCookie));
  }

  return NextResponse.json(
    { token, expiresInSeconds: JOIN_INTENT_TTL_SECONDS },
    { headers }
  );
}

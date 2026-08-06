import { NextResponse } from "next/server";
import { generateApplePass } from "@/lib/wallet/apple";
import { getApplePassUpdatedAt } from "@/lib/wallet/apple-version";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Apple Wallet — re-fetch the latest pass for a serial.
 * GET /api/wallet/apple/v1/passes/{passTypeId}/{serialNumber}
 *
 * Appelé par iOS après un push silencieux pour re-télécharger le .pkpass
 * mis à jour. Auth : "Authorization: ApplePass <authToken>".
 */
export async function GET(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ passTypeId: string; serialNumber: string }>;
  }
) {
  const { serialNumber } = await params;

  // Auth check
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^ApplePass\s+(.+)$/);
  const expectedAuth = serialNumber.replace(/-/g, "") + "0000";
  if (!m || m[1].trim() !== expectedAuth) {
    return new NextResponse(null, { status: 401 });
  }

  const card = await prisma.loyaltyCard.findUnique({
    where: { serialNumber },
    select: {
      id: true,
      updatedAt: true,
      program: {
        select: {
          updatedAt: true,
          merchant: { select: { updatedAt: true } },
        },
      },
    },
  });
  if (!card) return new NextResponse(null, { status: 404 });

  const passUpdatedAt = toHttpDate(getApplePassUpdatedAt(card).getTime());

  // If-Modified-Since (Apple envoie le timestamp du dernier fetch)
  const ims = req.headers.get("if-modified-since");
  if (ims) {
    const since = new Date(ims);
    if (!isNaN(since.getTime()) && passUpdatedAt.getTime() <= toHttpDate(since.getTime()).getTime()) {
      return new NextResponse(null, { status: 304 });
    }
  }

  let buf: Buffer | null = null;
  try {
    buf = await generateApplePass(card.id);
  } catch (err) {
    console.error("[wallet/apple/v1/passes] generation error:", err);
    return new NextResponse(null, { status: 500 });
  }
  if (!buf) return new NextResponse(null, { status: 500 });

  const syncedAt = new Date();
  await prisma.notificationLog.updateMany({
    where: {
      cardId: card.id,
      applePassSyncedAt: null,
      createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2) },
      walletStatus: { in: ["PENDING", "SENT", "ACCEPTED"] },
    },
    data: {
      appleStatus: "SYNCED",
      applePassSyncedAt: syncedAt,
      walletStatus: "SYNCED",
    },
  });

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Last-Modified": passUpdatedAt.toUTCString(),
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

function toHttpDate(timestamp: number) {
  return new Date(Math.floor(timestamp / 1000) * 1000);
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateContactGoogleWalletLink } from "@/lib/wallet/contact-google";

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const card = await prisma.contactCard.findUnique({
    where: { slug },
    select: { isActive: true },
  });
  if (!card?.isActive) {
    return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });
  }

  const url = await generateContactGoogleWalletLink(slug, "share");
  if (!url) {
    return NextResponse.json({ error: "Google Wallet non configuré" }, { status: 503 });
  }
  return NextResponse.redirect(url);
}

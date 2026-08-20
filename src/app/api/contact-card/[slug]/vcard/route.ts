import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildVCard, recordContactCardEvent } from "@/lib/contact-card";

export async function GET(_req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const card = await prisma.contactCard.findUnique({ where: { slug } });
  if (!card || !card.isActive) {
    return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });
  }

  await recordContactCardEvent(card.id, "CONTACT_DOWNLOAD");
  return new NextResponse(buildVCard(card), {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${card.slug}.vcf"`,
      "Cache-Control": "no-store",
    },
  });
}

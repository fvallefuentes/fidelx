import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildVCard, recordContactCardEvent } from "@/lib/contact-card";

export async function GET(_req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const card = await prisma.contactCard.findUnique({ where: { slug } });
  if (!card || !card.isActive) {
    return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });
  }

  let photo: { base64: string; type: "JPEG" } | undefined;
  const photoMatch = card.photoData?.match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/i);
  if (photoMatch) {
    try {
      const sharp = (await import("sharp")).default;
      const buffer = await sharp(Buffer.from(photoMatch[2], "base64"))
        .resize(512, 512, { fit: "cover" })
        .jpeg({ quality: 86 })
        .toBuffer();
      photo = { base64: buffer.toString("base64"), type: "JPEG" };
    } catch (error) {
      console.error("[contact-card] vCard photo conversion failed:", error);
    }
  }

  await recordContactCardEvent(card.id, "CONTACT_DOWNLOAD");
  return new NextResponse(buildVCard(card, photo), {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${card.slug}.vcf"`,
      "Cache-Control": "no-store",
    },
  });
}

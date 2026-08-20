import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function decodeImage(dataUrl?: string | null) {
  const match = dataUrl?.match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/i);
  if (!match) return null;
  return { mime: `image/${match[1].toLowerCase().replace("jpg", "jpeg")}`, buffer: Buffer.from(match[2], "base64") };
}

export async function GET(_req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const card = await prisma.contactCard.findUnique({ where: { slug }, select: { logoData: true, isActive: true } });
  if (!card?.isActive) return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });

  const image = decodeImage(card.logoData);
  const buffer = image?.buffer || await readFile(join(process.cwd(), "src/lib/wallet/powered_by_fidlify_logo.png"));
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": image?.mime || "image/png",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
    },
  });
}

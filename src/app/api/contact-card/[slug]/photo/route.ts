import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const card = await prisma.contactCard.findUnique({ where: { slug }, select: { photoData: true, isActive: true } });
  const match = card?.photoData?.match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/i);
  if (!card?.isActive || !match) return NextResponse.json({ error: "Image introuvable" }, { status: 404 });

  return new NextResponse(new Uint8Array(Buffer.from(match[2], "base64")), {
    headers: {
      "Content-Type": `image/${match[1].toLowerCase().replace("jpg", "jpeg")}`,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
    },
  });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordContactCardEvent } from "@/lib/contact-card";
import { generateContactApplePass } from "@/lib/wallet/contact-apple";

export async function GET(_req: Request, context: { params: Promise<{ slug: string }> }) {
  const rawSlug = (await context.params).slug;
  const slug = rawSlug.replace(/\.pkpass$/i, "");
  const card = await prisma.contactCard.findUnique({ where: { slug }, select: { id: true, isActive: true } });
  if (!card?.isActive) return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });

  const pass = await generateContactApplePass(slug);
  if (!pass) return NextResponse.json({ error: "Pass indisponible" }, { status: 404 });
  await recordContactCardEvent(card.id, "APPLE_WALLET");

  if (!process.env.APPLE_PASS_TYPE_ID) {
    return NextResponse.json(JSON.parse(pass.toString()), { headers: { "X-Dev-Mode": "true" } });
  }
  return new NextResponse(new Uint8Array(pass), {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="${slug}.pkpass"`,
      "Cache-Control": "no-store",
    },
  });
}

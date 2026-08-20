import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordContactCardEvent } from "@/lib/contact-card";

const schema = z.object({
  type: z.enum([
    "VIEW",
    "PHONE_CLICK",
    "EMAIL_CLICK",
    "WEBSITE_CLICK",
    "WHATSAPP_CLICK",
    "DIRECTIONS_CLICK",
    "BOOKING_CLICK",
  ]),
});

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const card = await prisma.contactCard.findUnique({ where: { slug }, select: { id: true, isActive: true } });
  if (!card?.isActive) return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });
  await recordContactCardEvent(card.id, parsed.data.type);
  return NextResponse.json({ success: true });
}

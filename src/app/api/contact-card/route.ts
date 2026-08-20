import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  contactCardPublicUrl,
  createContactCardSlug,
  normalizeWebUrl,
} from "@/lib/contact-card";

const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const imageData = z
  .string()
  .max(750_000)
  .refine((value) => !value || /^data:image\/(png|jpe?g|webp);base64,/i.test(value), {
    message: "Format d'image invalide",
  })
  .optional()
  .nullable();

const updateSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  companyName: z.string().trim().min(2).max(100),
  jobTitle: optionalText(80),
  email: z.union([z.literal(""), z.string().trim().email().max(160)]).optional().nullable(),
  phone: optionalText(40),
  website: optionalText(300),
  address: optionalText(220),
  whatsapp: optionalText(40),
  bookingUrl: optionalText(300),
  instagram: optionalText(100),
  linkedin: optionalText(300),
  logoData: imageData,
  photoData: imageData,
  bgColor: color,
  textColor: color,
  accentColor: color,
  isActive: z.boolean(),
});

async function merchantSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "USER") return null;
  return session.user.id;
}

async function ensureContactCard(merchantId: string) {
  const merchant = await prisma.user.findUnique({
    where: { id: merchantId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      notificationDefaultLogo: true,
      establishments: {
        take: 1,
        orderBy: { createdAt: "asc" },
        select: { name: true, address: true, phone: true, website: true },
      },
    },
  });
  if (!merchant) return null;

  const establishment = merchant.establishments[0];
  const companyName = establishment?.name || merchant.name || "Mon commerce";
  return prisma.contactCard.upsert({
    where: { merchantId },
    update: {},
    create: {
      merchantId,
      slug: createContactCardSlug(companyName, merchant.id),
      displayName: merchant.name || companyName,
      companyName,
      email: merchant.email,
      phone: establishment?.phone || merchant.phone,
      website: establishment?.website,
      address: establishment?.address,
      logoData: merchant.notificationDefaultLogo,
    },
  });
}

export async function GET() {
  const merchantId = await merchantSession();
  if (!merchantId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const card = await ensureContactCard(merchantId);
  if (!card) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [totals, recent] = await Promise.all([
    prisma.contactCardEvent.groupBy({
      by: ["type"],
      where: { cardId: card.id },
      _count: { _all: true },
    }),
    prisma.contactCardEvent.groupBy({
      by: ["type"],
      where: { cardId: card.id, createdAt: { gte: since } },
      _count: { _all: true },
    }),
  ]);

  return NextResponse.json({
    card,
    publicUrl: contactCardPublicUrl(card.slug),
    stats: {
      allTime: Object.fromEntries(totals.map((item) => [item.type, item._count._all])),
      last30Days: Object.fromEntries(recent.map((item) => [item.type, item._count._all])),
    },
  });
}

export async function PUT(req: Request) {
  const merchantId = await merchantSession();
  if (!merchantId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await ensureContactCard(merchantId);
  if (!existing) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }

  const value = parsed.data;
  const emptyToNull = (input?: string | null) => input?.trim() || null;
  const card = await prisma.contactCard.update({
    where: { merchantId },
    data: {
      displayName: value.displayName,
      companyName: value.companyName,
      jobTitle: emptyToNull(value.jobTitle),
      email: emptyToNull(value.email),
      phone: emptyToNull(value.phone),
      website: normalizeWebUrl(value.website),
      address: emptyToNull(value.address),
      whatsapp: emptyToNull(value.whatsapp),
      bookingUrl: normalizeWebUrl(value.bookingUrl),
      instagram: emptyToNull(value.instagram),
      linkedin: normalizeWebUrl(value.linkedin),
      logoData: emptyToNull(value.logoData),
      photoData: emptyToNull(value.photoData),
      bgColor: value.bgColor.toLowerCase(),
      textColor: value.textColor.toLowerCase(),
      accentColor: value.accentColor.toLowerCase(),
      isActive: value.isActive,
    },
  });

  return NextResponse.json({
    card,
    publicUrl: contactCardPublicUrl(card.slug),
  });
}

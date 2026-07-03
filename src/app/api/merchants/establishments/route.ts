import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseJsonBody } from "@/lib/api/validation";

const establishmentSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(120, "Nom trop long"),
  address: z.string().trim().max(240, "Adresse trop longue").optional().or(z.literal("")),
  phone: z.string().trim().max(40, "Téléphone trop long").optional().or(z.literal("")),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
}).refine(
  (data) => {
    const hasLatitude = data.latitude !== undefined && data.latitude !== null;
    const hasLongitude = data.longitude !== undefined && data.longitude !== null;
    return hasLatitude === hasLongitude;
  },
  { message: "Latitude et longitude doivent etre renseignees ensemble" }
);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const existingEstablishment = await prisma.establishment.findFirst({
    where: { merchantId: session.user.id },
    select: { id: true },
  });
  if (existingEstablishment) {
    return NextResponse.json(
      { error: "Un seul établissement peut être configuré pour le moment." },
      { status: 409 }
    );
  }

  const parsed = await parseJsonBody(req, establishmentSchema);
  if (!parsed.ok) return parsed.response;
  const { name, address, phone, latitude, longitude } = parsed.data;

  const establishment = await prisma.establishment.create({
    data: {
      merchantId: session.user.id,
      name,
      address: address || null,
      phone: phone || null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    },
  });

  return NextResponse.json(establishment, { status: 201 });
}

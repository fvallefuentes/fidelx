import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { name, address, phone, googlePlaceId, latitude, longitude } =
    await req.json();

  if (!name) {
    return NextResponse.json(
      { error: "Le nom est requis" },
      { status: 400 }
    );
  }

  const establishment = await prisma.establishment.create({
    data: {
      merchantId: session.user.id,
      name,
      address,
      phone,
      googlePlaceId,
      latitude,
      longitude,
    },
  });

  return NextResponse.json(establishment, { status: 201 });
}

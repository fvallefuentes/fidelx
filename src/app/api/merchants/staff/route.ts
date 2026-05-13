import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseJsonBody } from "@/lib/api/validation";

const createStaffSchema = z.object({
  name: z.string().trim().max(120, "Nom trop long").optional(),
  email: z.email("Email invalide").trim().toLowerCase(),
  password: z.string().min(8, "Mot de passe : minimum 8 caractères").max(256, "Mot de passe trop long"),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json([], { status: 401 });
  const staff = await prisma.user.findMany({
    where: { employerMerchantId: session.user.id, role: "STAFF" },
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(staff);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const parsed = await parseJsonBody(req, createStaffSchema);
  if (!parsed.ok) return parsed.response;
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email déjà utilisé" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const staff = await prisma.user.create({
    data: { name, email, passwordHash, role: "STAFF", employerMerchantId: session.user.id },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  return NextResponse.json(staff, { status: 201 });
}

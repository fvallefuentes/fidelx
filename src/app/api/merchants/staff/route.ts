import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

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
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { name, email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email déjà utilisé" }, { status: 409 });
  const passwordHash = await bcrypt.hash(password, 12);
  const staff = await prisma.user.create({
    data: { name, email, passwordHash, role: "STAFF", employerMerchantId: session.user.id },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  return NextResponse.json(staff, { status: 201 });
}

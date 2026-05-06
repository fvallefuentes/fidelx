import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const merchants = await prisma.user.findMany({
    where: { role: "USER" },
    select: {
      id: true, name: true, email: true, plan: true, createdAt: true,
      _count: { select: { programs: true, staff: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(merchants);
}

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
      id: true,
      name: true,
      email: true,
      plan: true,
      phone: true,
      createdAt: true,
      stripeSubscriptionId: true,
      _count: { select: { programs: true, staff: true } },
      programs: {
        select: {
          _count: { select: { cards: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Compute aggregated card count per merchant, then strip the nested programs array
  const enriched = merchants.map((m) => {
    const cardCount = m.programs.reduce((s, p) => s + p._count.cards, 0);
    return {
      id: m.id,
      name: m.name,
      email: m.email,
      plan: m.plan,
      phone: m.phone,
      createdAt: m.createdAt,
      stripeSubscriptionId: m.stripeSubscriptionId,
      _count: m._count,
      cardCount,
    };
  });

  return NextResponse.json(enriched);
}

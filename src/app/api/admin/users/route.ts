import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const adminRole = (session?.user as { role?: string })?.role;
  if (adminRole !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      plan: true,
      phone: true,
      createdAt: true,
      stripeSubscriptionId: true,
      manualPlanUntil: true,
      manualPlanReason: true,
      employerMerchantId: true,
      employerMerchant: { select: { id: true, name: true, email: true } },
      _count: { select: { programs: true, staff: true } },
      programs: {
        select: {
          _count: { select: { cards: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const enriched = users.map((u) => {
    const cardCount = u.programs.reduce(
      (s: number, p: { _count: { cards: number } }) => s + p._count.cards,
      0
    );
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      plan: u.plan,
      phone: u.phone,
      createdAt: u.createdAt,
      stripeSubscriptionId: u.stripeSubscriptionId,
      manualPlanUntil: u.manualPlanUntil,
      manualPlanReason: u.manualPlanReason,
      employerMerchant: u.employerMerchant,
      _count: u._count,
      cardCount,
    };
  });

  return NextResponse.json(enriched);
}

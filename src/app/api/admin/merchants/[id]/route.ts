import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") return null;
  return session;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const merchant = await prisma.user.findFirst({
    where: { id, role: "USER" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      plan: true,
      language: true,
      currency: true,
      createdAt: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripeCurrentPeriodStart: true,
      stripeCurrentPeriodEnd: true,
      establishments: {
        select: { id: true, name: true, address: true, phone: true },
      },
      programs: {
        select: {
          id: true,
          name: true,
          type: true,
          isActive: true,
          createdAt: true,
          _count: { select: { cards: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!merchant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const programIds = merchant.programs.map((p) => p.id);
  const [cardCount, scanCount, rewardCount, recentTx] = await Promise.all([
    prisma.loyaltyCard.count({ where: { programId: { in: programIds } } }),
    prisma.transaction.count({
      where: {
        card: { programId: { in: programIds } },
        type: { in: ["STAMP", "POINTS_EARN", "CASHBACK_EARN"] },
      },
    }),
    prisma.rewardClaim.count({
      where: { card: { programId: { in: programIds } } },
    }),
    prisma.transaction.findMany({
      where: { card: { programId: { in: programIds } } },
      select: {
        id: true,
        type: true,
        createdAt: true,
        card: { select: { serialNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return NextResponse.json({
    ...merchant,
    stats: { cardCount, scanCount, rewardCount },
    recentTx,
  });
}

type AdminPlan = "FREE" | "ESSENTIAL" | "GROWTH" | "MULTI_SITE";
const VALID_PLANS: AdminPlan[] = ["FREE", "ESSENTIAL", "GROWTH", "MULTI_SITE"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = (await req.json()) as { plan?: string };

  // Verify the merchant exists and has role USER before mutating
  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });
  if (!existing || existing.role !== "USER") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updates: { plan?: AdminPlan } = {};
  if (body.plan && VALID_PLANS.includes(body.plan as AdminPlan)) {
    updates.plan = body.plan as AdminPlan;
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updates,
    select: { id: true, plan: true },
  });

  return NextResponse.json(updated);
}

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

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      plan: true,
      language: true,
      currency: true,
      createdAt: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripeCurrentPeriodStart: true,
      stripeCurrentPeriodEnd: true,
      employerMerchantId: true,
      employerMerchant: {
        select: { id: true, name: true, email: true },
      },
      staff: {
        select: { id: true, name: true, email: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
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

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // For STAFF, scope stats to the EMPLOYER's programs (not their own — they have none)
  const programOwnerId =
    user.role === "STAFF" && user.employerMerchantId
      ? user.employerMerchantId
      : user.id;

  // Get programIds: for USER it's their own programs; for STAFF, employer's; for ADMIN, none
  let programIds: string[] = [];
  if (user.role === "USER") {
    programIds = user.programs.map((p) => p.id);
  } else if (user.role === "STAFF") {
    const employerPrograms = await prisma.loyaltyProgram.findMany({
      where: { merchantId: programOwnerId },
      select: { id: true },
    });
    programIds = employerPrograms.map((p) => p.id);
  }

  const [cardCount, scanCount, rewardCount, recentTx] =
    programIds.length === 0
      ? [0, 0, 0, []]
      : await Promise.all([
          prisma.loyaltyCard.count({
            where: { programId: { in: programIds } },
          }),
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
    ...user,
    stats: { cardCount, scanCount, rewardCount },
    recentTx,
  });
}

type AdminPlan = "FREE" | "ESSENTIAL" | "GROWTH" | "MULTI_SITE";
type AdminRole = "ADMIN" | "USER" | "STAFF";
const VALID_PLANS: AdminPlan[] = ["FREE", "ESSENTIAL", "GROWTH", "MULTI_SITE"];
const VALID_ROLES: AdminRole[] = ["ADMIN", "USER", "STAFF"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = (await req.json()) as { plan?: string; role?: string };

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updates: { plan?: AdminPlan; role?: AdminRole } = {};
  if (body.plan && VALID_PLANS.includes(body.plan as AdminPlan)) {
    updates.plan = body.plan as AdminPlan;
  }
  if (body.role && VALID_ROLES.includes(body.role as AdminRole)) {
    updates.role = body.role as AdminRole;
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updates,
    select: { id: true, role: true, plan: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  // Don't let admin delete themselves
  if (session.user?.id === id) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas supprimer votre propre compte" },
      { status: 400 }
    );
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

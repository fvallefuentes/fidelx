import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") || "all"; // all | suspicious | rate_limited | recovery
  const limit = Math.min(500, Number(searchParams.get("limit") || 200));

  const since24h = new Date(Date.now() - 24 * 60 * 60_000);
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60_000);

  // Filtre principal
  const where: Record<string, unknown> = {};
  if (filter === "rate_limited") where.result = "RATE_LIMITED";
  else if (filter === "recovery") where.result = "DUPLICATE_RECOVERY";
  else if (filter === "suspicious") {
    where.result = { in: ["RATE_LIMITED", "DUPLICATE_RECOVERY"] };
  }

  const attempts = await prisma.joinAttempt.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Programmes & noms commerçants pour enrichir l'affichage
  const programIds = [...new Set(attempts.map((a) => a.programId))];
  const programs = await prisma.loyaltyProgram.findMany({
    where: { id: { in: programIds } },
    select: {
      id: true,
      name: true,
      merchant: { select: { id: true, name: true, email: true } },
    },
  });
  const programMap = new Map(programs.map((p) => [p.id, p]));

  // Stats globales (24h, 7j)
  const [
    total24h,
    success24h,
    rateLimited24h,
    duplicate24h,
    total7d,
  ] = await Promise.all([
    prisma.joinAttempt.count({ where: { createdAt: { gte: since24h } } }),
    prisma.joinAttempt.count({
      where: { createdAt: { gte: since24h }, result: "SUCCESS" },
    }),
    prisma.joinAttempt.count({
      where: { createdAt: { gte: since24h }, result: "RATE_LIMITED" },
    }),
    prisma.joinAttempt.count({
      where: { createdAt: { gte: since24h }, result: "DUPLICATE_RECOVERY" },
    }),
    prisma.joinAttempt.count({ where: { createdAt: { gte: since7d } } }),
  ]);

  // Top IPs/cookies/fingerprints suspects (>3 attempts en 24h)
  const ipGroups = await prisma.joinAttempt.groupBy({
    by: ["ipPrefix"],
    where: { createdAt: { gte: since24h }, ipPrefix: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { ipPrefix: "desc" } },
    having: { ipPrefix: { _count: { gt: 3 } } },
    take: 10,
  });

  const cookieGroups = await prisma.joinAttempt.groupBy({
    by: ["deviceCookie"],
    where: { createdAt: { gte: since24h }, deviceCookie: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { deviceCookie: "desc" } },
    having: { deviceCookie: { _count: { gt: 3 } } },
    take: 10,
  });

  // IPs actuellement bloquées (non expirées)
  const blockedIps = await prisma.blockedIp.findMany({
    where: {
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    stats: {
      total24h,
      success24h,
      rateLimited24h,
      duplicate24h,
      total7d,
    },
    suspicious: {
      ips: ipGroups.map((g) => ({
        ipPrefix: g.ipPrefix,
        count: g._count._all,
      })),
      cookies: cookieGroups.map((g) => ({
        deviceCookie: g.deviceCookie,
        count: g._count._all,
      })),
    },
    blockedIps,
    attempts: attempts.map((a) => ({
      ...a,
      program: programMap.get(a.programId) ?? null,
    })),
  });
}

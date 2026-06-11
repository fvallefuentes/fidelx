import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


/* ─── IP block cache (TTL 60s, partagé entre requêtes du même worker) ─── */
let ipCache: { set: Set<string>; fetchedAt: number } | null = null;
const IP_CACHE_TTL_MS = 60_000;

async function getBlockedIpSet(): Promise<Set<string>> {
  const now = Date.now();
  if (ipCache && now - ipCache.fetchedAt < IP_CACHE_TTL_MS) {
    return ipCache.set;
  }
  try {
    const rows = await prisma.blockedIp.findMany({
      where: {
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date(now) } }],
      },
      select: { ipPrefix: true },
    });
    ipCache = { set: new Set(rows.map((r) => r.ipPrefix)), fetchedAt: now };
  } catch (e) {
    console.error("[middleware/ipBlock] DB query failed:", (e as Error).message);
    // En cas d'erreur DB, on garde le cache existant ou un set vide
    if (!ipCache) ipCache = { set: new Set(), fetchedAt: now };
  }
  return ipCache.set;
}

/** Anonymise une IP au prefix /24 IPv4 ou /48 IPv6 (cohérent avec lib/anti-abuse/fingerprint.ts). */
function anonymizeIp(ip: string | null): string | null {
  if (!ip) return null;
  const trimmed = ip.trim();
  if (!trimmed) return null;
  if (trimmed.includes(":")) {
    const parts = trimmed.split(":");
    return parts.slice(0, 3).join(":") + "::/48";
  }
  const parts = trimmed.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  }
  return trimmed;
}

function extractIp(req: NextRequest): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ─── IP BLOCK CHECK (priorité absolue) ───
  // L'IP du visiteur est comparée à la liste des prefixes bloqués (cache 60s).
  // Les visiteurs bloques voient une page 403 avant les regles de role.
  const ip = extractIp(req);
  const ipPrefix = anonymizeIp(ip);
  if (ipPrefix) {
    const blockedSet = await getBlockedIpSet();
    if (blockedSet.has(ipPrefix)) {
      return new NextResponse(
        "<h1>Accès bloqué</h1><p>Votre adresse IP a été bloquée par l'administrateur. Si vous pensez qu'il s'agit d'une erreur, contactez contact@fidlify.com.</p>",
        {
          status: 403,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }
  }


  // ─── ROLE-BASED ACCESS (utilisateurs connectés) ───
  const token = await getToken({ req });
  if (!token) return NextResponse.next();

  const role = (token.role as string) ?? "USER";

  // STAFF : limité à /dashboard/scan et /api/transactions/stamp
  if (role === "STAFF") {
    const allowed =
      pathname === "/dashboard/scan" ||
      pathname === "/dashboard" ||
      pathname.startsWith("/api/transactions/stamp") ||
      pathname.startsWith("/api/programs") ||
      pathname.startsWith("/api/auth") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon");
    if (!allowed) {
      return NextResponse.redirect(new URL("/dashboard/scan", req.url));
    }
  }

  // ADMIN : redirect /dashboard → /admin
  if (role === "ADMIN" && pathname === "/dashboard") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  // Non-ADMIN qui tente /admin → redirect
  if (role !== "ADMIN" && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

/* ─── Config ─── */
// Prisma requiert le runtime Node.js (Edge ne supporte pas l'adapter pg).
// Sur Next.js 15+ : runtime "nodejs" est dispo en middleware.
export const config = {
  runtime: "nodejs",
  matcher: [
    "/((?!_next/static|_next/image|icon.svg|favicon.ico).*)",
  ],
};

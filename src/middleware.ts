import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BETA_COOKIE = "fidlify_beta_ok";

// Routes laissées ouvertes même quand le beta gate est actif :
const BETA_GATE_OPEN_PATHS = new Set([
  "/beta-access",
  "/api/beta-access",
  "/robots.txt",
  "/sitemap.xml",
  "/icon.svg",
  "/favicon.ico",
  "/manifest.webmanifest",
  "/sw.js",
  "/reset-password", // user reçoit le lien par email, doit pouvoir l'ouvrir
  "/forgot-password", // page publique pour demander un reset
]);

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
  // Le /beta-access est OUVERT pour permettre à l'admin de débloquer une IP
  // via /admin/abuse même si elle est bloquée. Sauf que /admin nécessite
  // une connexion donc en pratique pas un risque.
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

  // ─── BETA GATE (phase de test) ───
  // Tous les /api/* sont AUTORISÉS (webhooks Stripe, Apple/Google Wallet,
  // cron, NextAuth). Le gate ne s'applique qu'aux pages browser.
  // /r/* (liens parrainage merchant) sont OUVERTS pour que le clic pose
  // le cookie d'attribution avant la redirection (le filleul finira sur
  // /register qui passera par /beta-access avec son cookie intact).
  // /blog/* est OUVERT pour le SEO : Google doit pouvoir crawler les
  // articles pendant la phase beta.
  // /newsletter/* est OUVERT pour que les liens d'email (confirmation,
  // désabo) fonctionnent sans demander le password beta aux abonnés.
  const betaPassword = process.env.BETA_ACCESS_PASSWORD;
  if (
    betaPassword &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/r/") &&
    !pathname.startsWith("/blog") &&
    !pathname.startsWith("/newsletter") &&
    !BETA_GATE_OPEN_PATHS.has(pathname)
  ) {
    const cookie = req.cookies.get(BETA_COOKIE);
    if (cookie?.value !== "1") {
      const url = req.nextUrl.clone();
      url.pathname = "/beta-access";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
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

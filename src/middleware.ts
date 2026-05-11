import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const BETA_COOKIE = "fidlify_beta_ok";

// Routes laissées ouvertes même quand le beta gate est actif :
// - /beta-access : la page d'accès elle-même (sinon boucle infinie)
// - /api/beta-access : POST handler du gate
// - /robots.txt, /sitemap.xml, /icon.svg, /favicon.ico : metadata files
//
// Toutes les autres routes /api/* sont déjà exclues via le matcher
// (Stripe webhooks, Apple/Google Wallet, cron, etc.)
const BETA_GATE_OPEN_PATHS = new Set([
  "/beta-access",
  "/api/beta-access",
  "/robots.txt",
  "/sitemap.xml",
  "/icon.svg",
  "/favicon.ico",
  "/manifest.webmanifest",
  "/sw.js",
]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ─── BETA GATE (phase de test) ───
  // Si BETA_ACCESS_PASSWORD est défini, on bloque toute requête browser
  // sans le cookie fidlify_beta_ok=1.
  const betaPassword = process.env.BETA_ACCESS_PASSWORD;
  if (betaPassword && !BETA_GATE_OPEN_PATHS.has(pathname)) {
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

// Matcher élargi : on intercepte tout SAUF les routes API (webhooks
// Stripe, Apple/Google Wallet, NextAuth, cron) et les assets Next.js.
//
// Le beta gate s'applique sur la majorité des pages browser ;
// la logique role-based reste fonctionnelle sur /dashboard et /admin.
export const config = {
  matcher: [
    /*
     * Match toutes les routes sauf :
     * - api (toutes routes API : webhooks, NextAuth, wallet, cron, etc.)
     * - _next/static (fichiers statiques Next.js)
     * - _next/image (optimisation d'images)
     * - icon.svg, favicon.ico (metadata files)
     */
    "/((?!api|_next/static|_next/image|icon.svg|favicon.ico).*)",
  ],
};

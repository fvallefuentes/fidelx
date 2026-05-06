import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  const { pathname } = req.nextUrl;

  // Not logged in → let NextAuth handle redirect
  if (!token) return NextResponse.next();

  const role = (token.role as string) ?? "USER";

  // STAFF: can only access /dashboard/scan and /api/transactions/stamp
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

  // ADMIN: redirect /dashboard → /admin
  if (role === "ADMIN" && pathname === "/dashboard") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  // Non-ADMIN trying to access /admin → redirect
  if (role !== "ADMIN" && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/api/merchants/:path*", "/api/programs/:path*", "/api/cards/:path*", "/api/transactions/:path*"],
};

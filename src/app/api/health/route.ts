import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, string> = {};

  // Check env vars
  checks.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ? "SET" : "MISSING";
  checks.NEXTAUTH_URL = process.env.NEXTAUTH_URL || "MISSING";
  checks.DATABASE_URL = process.env.DATABASE_URL ? "SET (hidden)" : "MISSING";
  checks.DIRECT_DATABASE_URL = process.env.DIRECT_DATABASE_URL ? "SET (hidden)" : "MISSING";
  checks.NODE_ENV = process.env.NODE_ENV || "unknown";

  // Test DB connection
  try {
    const { prisma } = await import("@/lib/prisma");
    const result = await prisma.$queryRawUnsafe("SELECT 1 as ok");
    checks.database = "CONNECTED";
  } catch (e: unknown) {
    checks.database = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Test NextAuth import
  try {
    await import("next-auth");
    checks.nextauth = "LOADED";
  } catch (e: unknown) {
    checks.nextauth = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json(checks);
}

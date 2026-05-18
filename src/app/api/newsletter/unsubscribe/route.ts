import { NextResponse } from "next/server";
import { unsubscribeNewsletter } from "@/lib/newsletter";

/**
 * GET /api/newsletter/unsubscribe?token=...
 * Désabonnement 1-clic (RGPD). Idempotent.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const result = await unsubscribeNewsletter(token);

  const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.fidlify.com";
  if (result.ok) {
    return NextResponse.redirect(`${base}/newsletter/unsubscribed`);
  }
  return NextResponse.redirect(
    `${base}/newsletter/error?reason=${encodeURIComponent(result.reason ?? "unknown")}`
  );
}

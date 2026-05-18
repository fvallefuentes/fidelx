import { NextResponse } from "next/server";
import { confirmNewsletter } from "@/lib/newsletter";

/**
 * GET /api/newsletter/confirm?token=...
 * Confirme une inscription newsletter (double opt-in).
 * Redirige vers /newsletter/ok ou /newsletter/expired selon le résultat.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const result = await confirmNewsletter(token);

  const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.fidlify.com";
  if (result.ok) {
    return NextResponse.redirect(`${base}/newsletter/ok`);
  }
  return NextResponse.redirect(
    `${base}/newsletter/error?reason=${encodeURIComponent(result.reason ?? "unknown")}`
  );
}

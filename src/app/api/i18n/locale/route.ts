import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isLocale, localeCookieName } from "@/i18n/locales";
import { parseJsonBody } from "@/lib/api/validation";

const localeSchema = z.object({
  locale: z.string().refine(isLocale, "Unsupported locale"),
});

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, localeSchema);
  if (!parsed.ok) return parsed.response;

  const cookieStore = await cookies();
  cookieStore.set(localeCookieName, parsed.data.locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.json({ ok: true, locale: parsed.data.locale });
}

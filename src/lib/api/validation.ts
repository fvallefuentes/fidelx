import { NextResponse } from "next/server";
import { z } from "zod";

export type ParsedBody<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export async function parseJsonBody<TSchema extends z.ZodType>(
  req: Request,
  schema: TSchema
): Promise<ParsedBody<z.infer<TSchema>>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Body JSON invalide" }, { status: 400 }),
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      ok: false,
      response: NextResponse.json(
        { error: firstIssue?.message || "Données invalides" },
        { status: 400 }
      ),
    };
  }

  return { ok: true, data: parsed.data };
}

export function requireCronSecret(req: Request): NextResponse | null {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.error("[cron] CRON_SECRET is not configured");
    return NextResponse.json({ error: "cron secret not configured" }, { status: 503 });
  }

  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return null;
}


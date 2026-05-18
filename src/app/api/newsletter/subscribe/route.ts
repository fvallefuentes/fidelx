import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { subscribeToNewsletter } from "@/lib/newsletter";
import { extractContext } from "@/lib/anti-abuse/fingerprint";

const schema = z.object({
  email: z.email("Email invalide").trim().toLowerCase().max(200),
  locale: z.enum(["fr", "de", "it", "en"]).optional().default("fr"),
  source: z.string().trim().max(40).optional(),
  // Honeypot anti-bot : si rempli → on accepte sans rien faire
  hp: z.string().optional(),
});

/**
 * POST /api/newsletter/subscribe
 * Inscription à la newsletter (double opt-in obligatoire).
 *
 * Réponse opaque : on retourne toujours `{ ok: true }` (même en cas
 * d'email invalide ou de honeypot rempli) pour éviter l'énumération
 * d'adresses et le scraping.
 */
export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, schema);
  if (!parsed.ok) {
    // Réponse opaque : on ne révèle pas le détail des erreurs validation
    return NextResponse.json({ ok: true });
  }

  // Honeypot : si rempli → bot probable, on no-op silencieusement
  if (parsed.data.hp && parsed.data.hp.trim().length > 0) {
    console.log("[newsletter] honeypot triggered:", parsed.data.email);
    return NextResponse.json({ ok: true });
  }

  const ctx = extractContext(req);
  const referer = req.headers.get("referer") || undefined;

  await subscribeToNewsletter({
    email: parsed.data.email,
    locale: parsed.data.locale,
    source: parsed.data.source,
    referer,
    ipPrefix: ctx.ipPrefix,
    userAgent: ctx.userAgent,
  });

  return NextResponse.json({ ok: true });
}

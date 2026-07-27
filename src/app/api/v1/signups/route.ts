import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseJsonBody } from "@/lib/api/validation";
import { anonymizeIp, extractIp } from "@/lib/anti-abuse/fingerprint";
import { normalizeEmail } from "@/lib/normalize";

/**
 * POST /api/v1/signups
 *
 * Demande de création de compte depuis la landing : le prospect a composé sa
 * carte dans l'éditeur, il laisse ses coordonnées. On enregistre la demande
 * AVEC la configuration de carte, pour pouvoir la lui réappliquer ensuite —
 * avant, tout son travail était perdu à la redirection.
 *
 * Endpoint public : validation stricte + garde-fou par IP anonymisée.
 */

const signupSchema = z.object({
  email: z
    .string()
    .trim()
    .min(3, "E-mail requis")
    .max(200, "E-mail trop long")
    .email("E-mail invalide"),
  businessName: z.string().trim().max(120, "Nom de commerce trop long").optional(),
  contactName: z.string().trim().max(120, "Nom trop long").optional(),
  phone: z.string().trim().max(40, "Téléphone trop long").optional(),
  cardConfig: z.record(z.string(), z.unknown()).optional(),
  source: z.string().trim().max(40).optional(),
});

/** Au-delà, on considère que c'est du bruit : une IP légitime ne demande pas
 *  10 créations de compte en une heure. */
const MAX_PER_IP_PER_HOUR = 10;
/** La config de carte reste petite (thème, couleurs, libellés). Au-delà, on
 *  l'ignore plutôt que de refuser la demande : le lead compte plus. */
const MAX_CARD_CONFIG_BYTES = 20_000;

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, signupSchema);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  const email = normalizeEmail(data.email);
  if (!email) {
    return NextResponse.json({ error: "E-mail invalide" }, { status: 400 });
  }

  const ipPrefix = anonymizeIp(extractIp(req));
  const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;
  const referer = req.headers.get("referer")?.slice(0, 300) ?? null;

  if (ipPrefix) {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await prisma.signup.count({
      where: { ipPrefix, createdAt: { gte: since } },
    });
    if (recent >= MAX_PER_IP_PER_HOUR) {
      return NextResponse.json(
        { error: "Trop de demandes depuis cette connexion. Réessayez plus tard." },
        { status: 429 }
      );
    }
  }

  let cardConfig = data.cardConfig;
  if (cardConfig && JSON.stringify(cardConfig).length > MAX_CARD_CONFIG_BYTES) {
    cardConfig = undefined;
  }

  try {
    const signup = await prisma.signup.create({
      data: {
        email,
        businessName: data.businessName || null,
        contactName: data.contactName || null,
        phone: data.phone || null,
        cardConfig: cardConfig ? (cardConfig as object) : undefined,
        source: data.source || "landing",
        referer,
        ipPrefix,
        userAgent,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: signup.id }, { status: 201 });
  } catch (error) {
    console.error("[signups] création impossible:", error);
    return NextResponse.json(
      { error: "Enregistrement impossible pour le moment." },
      { status: 500 }
    );
  }
}

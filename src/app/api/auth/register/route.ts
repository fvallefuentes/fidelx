import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issueVerificationCode } from "@/lib/email/verification";
import { parseJsonBody } from "@/lib/api/validation";
import { extractContext } from "@/lib/anti-abuse/fingerprint";
import {
  attributeMerchantReferral,
  buildClearReferralCookieHeader,
  readReferralCookie,
} from "@/lib/referral/merchant";

const registerSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(120, "Nom trop long"),
  email: z.email("Email invalide").trim().toLowerCase(),
  password: z.string().min(8, "Mot de passe : minimum 8 caractères").max(256, "Mot de passe trop long"),
  language: z.enum(["fr", "de", "it", "en"]).optional().default("fr"),
  // Code parrain optionnel envoyé par le form si visible (query ?ref). Sinon
  // on lit le cookie posé par /r/[code].
  ref: z.string().trim().toLowerCase().max(60).optional(),
});

export async function POST(req: Request) {
  try {
    const parsed = await parseJsonBody(req, registerSchema);
    if (!parsed.ok) return parsed.response;
    const { name, email: normalizedEmail, password, language, ref: refFromBody } = parsed.data;

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      if (!existingUser.emailVerified) {
        await issueVerificationCode(normalizedEmail);
        return NextResponse.json(
          {
            requiresVerification: true,
            email: normalizedEmail,
            existing: true,
          },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { error: "Un compte existe déjà avec cet email" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const created = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        language,
      },
      select: { id: true },
    });

    // ── Parrainage B2B ────────────────────────────────────────────
    // Priorité au code envoyé en body (form), sinon cookie d'attribution.
    // L'attribution est silencieuse : un échec ne casse pas l'inscription.
    const refCode =
      refFromBody || readReferralCookie(req.headers.get("cookie"));
    let attributedOk = false;
    if (refCode) {
      const ctx = extractContext(req);
      const attribution = await attributeMerchantReferral({
        code: refCode,
        refereeId: created.id,
        ipPrefix: ctx.ipPrefix,
        fingerprint: ctx.fingerprint,
      });
      attributedOk = !!attribution;
    }

    await issueVerificationCode(normalizedEmail);

    const res = NextResponse.json(
      {
        requiresVerification: true,
        email: normalizedEmail,
      },
      { status: 201 }
    );
    // Une fois l'attribution faite (ou refusée définitivement), on efface
    // le cookie pour éviter qu'un autre register sur le même device l'utilise.
    if (refCode && attributedOk) {
      res.headers.append("Set-Cookie", buildClearReferralCookieHeader());
    }
    return res;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'inscription" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCode } from "@/lib/email/verification";

const REASON_MESSAGES: Record<string, string> = {
  no_code:
    "Aucun code en cours pour cet email. Demandez un nouveau code.",
  expired: "Ce code a expiré. Demandez un nouveau code.",
  too_many_attempts:
    "Trop de tentatives. Demandez un nouveau code pour réessayer.",
  invalid_code: "Code incorrect.",
};

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email et code requis" },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const result = await verifyCode(normalizedEmail, String(code));

    if (!result.ok) {
      return NextResponse.json(
        { error: REASON_MESSAGES[result.reason] || "Code invalide" },
        { status: 400 }
      );
    }

    // Marquer l'email comme vérifié (idempotent)
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, emailVerified: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Compte introuvable" },
        { status: 404 }
      );
    }

    if (!user.emailVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    }

    return NextResponse.json({ ok: true, email: normalizedEmail });
  } catch (error) {
    console.error("verify-email error:", error);
    return NextResponse.json(
      { error: "Erreur de vérification" },
      { status: 500 }
    );
  }
}

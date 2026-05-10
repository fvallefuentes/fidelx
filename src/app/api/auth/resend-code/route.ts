import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueVerificationCode } from "@/lib/email/verification";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Ne pas leak l'existence du compte : on retourne ok dans tous les cas
    // si le format est valide. On émet le code seulement si le compte existe
    // et n'est pas déjà vérifié.
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, emailVerified: true },
    });

    if (!user || user.emailVerified) {
      // Réponse opaque + petit délai pour éviter timing-leak
      await new Promise((r) => setTimeout(r, 80));
      return NextResponse.json({ ok: true });
    }

    const result = await issueVerificationCode(normalizedEmail);

    if (!result.ok && result.cooldownUntil) {
      const seconds = Math.ceil(
        (result.cooldownUntil.getTime() - Date.now()) / 1000
      );
      return NextResponse.json(
        {
          error: `Veuillez patienter ${seconds}s avant de demander un nouveau code.`,
          cooldownSeconds: seconds,
        },
        { status: 429 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("resend-code error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi du code" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { issueVerificationCode } from "@/lib/email/verification";

export async function POST(req: Request) {
  try {
    const { name, email, password, language } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Nom, email et mot de passe requis" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      // Cas particulier : compte existe mais email pas encore vérifié
      // → on régénère un code (cooldown géré par issueVerificationCode)
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

    await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        language: language || "fr",
        // emailVerified reste null jusqu'à validation du code
      },
    });

    // Émettre + envoyer le code OTP
    await issueVerificationCode(normalizedEmail);

    return NextResponse.json(
      {
        requiresVerification: true,
        email: normalizedEmail,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'inscription" },
      { status: 500 }
    );
  }
}

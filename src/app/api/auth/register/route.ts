import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issueVerificationCode } from "@/lib/email/verification";
import { parseJsonBody } from "@/lib/api/validation";

const registerSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(120, "Nom trop long"),
  email: z.email("Email invalide").trim().toLowerCase(),
  password: z.string().min(8, "Mot de passe : minimum 8 caractères").max(256, "Mot de passe trop long"),
  language: z.enum(["fr", "de", "it", "en"]).optional().default("fr"),
});

export async function POST(req: Request) {
  try {
    const parsed = await parseJsonBody(req, registerSchema);
    if (!parsed.ok) return parsed.response;
    const { name, email: normalizedEmail, password, language } = parsed.data;

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

    await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        language,
      },
    });

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

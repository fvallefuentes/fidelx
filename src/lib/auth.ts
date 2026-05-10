import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    newUser: "/dashboard",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email et mot de passe requis");
        }

        const normalizedEmail = credentials.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!user || !user.passwordHash) {
          throw new Error("Email ou mot de passe incorrect");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValid) {
          throw new Error("Email ou mot de passe incorrect");
        }

        // Bloquer la connexion si l'email n'est pas vérifié.
        // Bypass : ADMIN (cas de seed initial uniquement).
        // Le préfixe EMAIL_NOT_VERIFIED: est détecté côté UI pour rediriger
        // vers /verify-email avec l'email pré-rempli.
        if (!user.emailVerified && user.role !== "ADMIN") {
          throw new Error(`EMAIL_NOT_VERIFIED:${normalizedEmail}`);
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.plan = token.plan as string;
        (session.user as { createdAt?: string }).createdAt = token.createdAt as string;
        session.user.role = token.role as string;
        (session.user as { merchantId?: string }).merchantId = token.merchantId as string;
        (session.user as { manualPlanUntil?: string }).manualPlanUntil =
          token.manualPlanUntil as string | undefined;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            plan: true,
            createdAt: true,
            role: true,
            employerMerchantId: true,
            manualPlanUntil: true,
          },
        });

        let effectivePlan = dbUser?.plan ?? "FREE";
        let manualUntil = dbUser?.manualPlanUntil ?? null;

        // Auto-revert expired manual plan (partenariat) → FREE
        if (manualUntil && manualUntil < new Date()) {
          await prisma.user.update({
            where: { id: token.id as string },
            data: { plan: "FREE", manualPlanUntil: null, manualPlanReason: null },
          });
          effectivePlan = "FREE";
          manualUntil = null;
        }

        token.plan = effectivePlan;
        token.createdAt = dbUser?.createdAt?.toISOString();
        token.role = dbUser?.role ?? "USER";
        token.manualPlanUntil = manualUntil?.toISOString();
        // For STAFF, merchantId = their employer's ID; for others, it's their own id
        token.merchantId = dbUser?.role === "STAFF"
          ? (dbUser.employerMerchantId ?? token.id)
          : (token.id as string);
      }
      return token;
    },
  },
};

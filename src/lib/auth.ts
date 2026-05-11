import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

/**
 * Helper : log une tentative de connexion (fire-and-forget).
 * Capture l'IP et UA depuis l'authorize() — extraits via la lib req
 * dynamiquement (NextAuth ne passe pas req à authorize directement,
 * donc on logue ce qu'on a).
 */
async function logLoginAttempt(input: {
  email: string;
  userId?: string | null;
  result:
    | "SUCCESS"
    | "WRONG_PASSWORD"
    | "USER_NOT_FOUND"
    | "EMAIL_NOT_VERIFIED"
    | "SUSPENDED"
    | "ERROR";
  reason?: string;
  ipPrefix?: string | null;
  userAgent?: string | null;
}) {
  try {
    await prisma.loginLog.create({
      data: {
        email: input.email,
        userId: input.userId ?? null,
        result: input.result,
        reason: input.reason ?? null,
        ipPrefix: input.ipPrefix ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (e) {
    console.error("[loginLog] failed:", (e as Error).message);
  }
}

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
      async authorize(credentials, req) {
        // Extraction du contexte (IP / UA) pour le log
        const ip = (req?.headers?.["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
          (req?.headers?.["x-real-ip"] as string) ||
          null;
        const ipPrefix = ip
          ? ip.includes(":")
            ? ip.split(":").slice(0, 3).join(":") + "::/48"
            : (() => {
                const parts = ip.split(".");
                return parts.length === 4
                  ? `${parts[0]}.${parts[1]}.${parts[2]}.0/24`
                  : ip;
              })()
          : null;
        const userAgent = (req?.headers?.["user-agent"] as string) || null;

        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email et mot de passe requis");
        }

        const normalizedEmail = credentials.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!user || !user.passwordHash) {
          void logLoginAttempt({
            email: normalizedEmail,
            result: "USER_NOT_FOUND",
            ipPrefix,
            userAgent,
          });
          throw new Error("Email ou mot de passe incorrect");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValid) {
          void logLoginAttempt({
            email: normalizedEmail,
            userId: user.id,
            result: "WRONG_PASSWORD",
            ipPrefix,
            userAgent,
          });
          throw new Error("Email ou mot de passe incorrect");
        }

        // Bloquer la connexion si l'email n'est pas vérifié (sauf ADMIN seed).
        if (!user.emailVerified && user.role !== "ADMIN") {
          void logLoginAttempt({
            email: normalizedEmail,
            userId: user.id,
            result: "EMAIL_NOT_VERIFIED",
            ipPrefix,
            userAgent,
          });
          throw new Error(`EMAIL_NOT_VERIFIED:${normalizedEmail}`);
        }

        // Bloquer la connexion si l'utilisateur a été suspendu par un admin
        if (user.suspendedAt) {
          void logLoginAttempt({
            email: normalizedEmail,
            userId: user.id,
            result: "SUSPENDED",
            reason: user.suspendedReason ?? undefined,
            ipPrefix,
            userAgent,
          });
          throw new Error(
            "ACCOUNT_SUSPENDED:" +
              encodeURIComponent(user.suspendedReason || "Contactez l'équipe Fidlify")
          );
        }

        void logLoginAttempt({
          email: normalizedEmail,
          userId: user.id,
          result: "SUCCESS",
          ipPrefix,
          userAgent,
        });

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

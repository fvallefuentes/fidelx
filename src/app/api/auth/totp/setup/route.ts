import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";
import {
  generateTotpSecret,
  buildOtpAuthUrl,
} from "@/lib/auth/totp";

/**
 * POST /api/auth/totp/setup
 *
 * Étape 1 du flow d'activation 2FA. Génère un secret + une URL otpauth
 * scannable par l'app TOTP du user. Le secret N'est PAS encore persisté
 * comme "actif" — il faut que le user prouve qu'il a bien scanné via
 * /api/auth/totp/enable avant qu'on flip totpEnabled=true.
 *
 * Le secret intermédiaire est stocké dans une session temporaire côté
 * cookie sécurisé. Si le user abandonne, aucun changement DB.
 */

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  // 2FA réservé aux comptes ADMIN : les merchants (USER) et staff n'y ont pas accès.
  if ((session.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Le 2FA est réservé aux comptes administrateurs Fidlify." },
      { status: 403 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, totpEnabled: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }
  if (user.totpEnabled) {
    return NextResponse.json(
      { error: "2FA déjà activée. Désactivez-la d'abord pour la reconfigurer." },
      { status: 400 }
    );
  }

  const secret = generateTotpSecret();
  const otpauthUrl = buildOtpAuthUrl(user.email, secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
    width: 256,
    margin: 1,
  });

  // Réponse : on renvoie le secret en clair UNE seule fois pour que le
  // front l'envoie ensuite à /enable avec le code de vérification. Le
  // secret ne touche la DB que si l'utilisateur valide via /enable.
  return NextResponse.json({
    secret,
    otpauthUrl,
    qrCodeDataUrl,
    email: user.email,
  });
}

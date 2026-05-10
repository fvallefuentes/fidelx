import { getFromAddress, getTransporter } from "./transport";
import { recoveryEmail } from "./templates";

/**
 * Envoie un email de récupération de carte au client.
 *
 * Appelé automatiquement par /api/programs/[id]/join quand un client
 * tente de s'inscrire à un programme pour lequel il a déjà une carte.
 *
 * Privacy : la fonction est silencieuse côté API (jamais relayée à l'UI).
 * Combinée à la réponse opaque côté serveur, on évite tout email enumeration.
 */
export async function sendRecoveryEmail({
  toEmail,
  firstName,
  programName,
  merchantName,
  serialNumber,
}: {
  toEmail: string;
  firstName: string;
  programName: string;
  merchantName: string;
  serialNumber: string;
}): Promise<void> {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://www.fidlify.com";
  const recoveryUrl = `${appUrl}/carte/${serialNumber}`;

  const transporter = getTransporter();
  const { subject, html, text } = recoveryEmail({
    firstName,
    programName,
    merchantName,
    recoveryUrl,
  });

  if (!transporter) {
    console.warn(
      `[email] SMTP not configured. Recovery URL for ${toEmail}: ${recoveryUrl}`
    );
    return;
  }

  try {
    await transporter.sendMail({
      from: getFromAddress(),
      to: toEmail,
      subject,
      html,
      text,
    });
  } catch (err) {
    // Ne jamais throw : l'erreur d'envoi ne doit pas leak via la réponse API.
    console.error("[email] sendRecoveryEmail failed:", (err as Error).message);
  }
}

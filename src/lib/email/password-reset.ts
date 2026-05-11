import { getFromAddress, getTransporter } from "./transport";
import { passwordResetEmail } from "./templates";

/**
 * Envoie un email de réinitialisation de mot de passe à un utilisateur.
 * Fire-and-forget : ne throw jamais (anti-enumeration).
 */
export async function sendPasswordResetEmail(input: {
  toEmail: string;
  firstName?: string | null;
  resetUrl: string;
  ttlHours: number;
}): Promise<void> {
  const transporter = getTransporter();
  const { subject, html, text } = passwordResetEmail({
    firstName: input.firstName,
    resetUrl: input.resetUrl,
    ttlHours: input.ttlHours,
  });

  if (!transporter) {
    console.warn(
      `[email] SMTP not configured. Password reset URL for ${input.toEmail}: ${input.resetUrl}`
    );
    return;
  }

  try {
    await transporter.sendMail({
      from: getFromAddress(),
      to: input.toEmail,
      subject,
      html,
      text,
    });
  } catch (err) {
    console.error("[email] sendPasswordResetEmail failed:", (err as Error).message);
  }
}

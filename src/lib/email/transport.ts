import nodemailer, { type Transporter } from "nodemailer";

/**
 * Transport SMTP partagé.
 *
 * Configuration via env :
 * - SMTP_HOST       (ex: mail.infomaniak.com)
 * - SMTP_PORT       (465 = SSL, 587 = STARTTLS)
 * - SMTP_USER       (login complet, ex: noreply@fidlify.com)
 * - SMTP_PASSWORD
 * - SMTP_FROM_EMAIL (defaut: SMTP_USER)
 * - SMTP_FROM_NAME  (defaut: "Fidlify")
 *
 * Mode dev/sans SMTP : si SMTP_HOST n'est pas défini, l'envoi est
 * simulé et le contenu de l'email est loggé dans la console serveur.
 * Permet de tester l'UX du flow sans serveur SMTP configuré.
 */

let cached: Transporter | null = null;

export function getTransporter(): Transporter | null {
  if (cached) return cached;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    return null;
  }

  cached = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true pour 465, false pour 587 (STARTTLS)
    auth: { user, pass },
  });
  return cached;
}

export function getFromAddress(): string {
  const fromEmail =
    process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "noreply@fidlify.com";
  const fromName = process.env.SMTP_FROM_NAME || "Fidlify";
  return `"${fromName}" <${fromEmail}>`;
}

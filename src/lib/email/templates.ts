/**
 * Templates HTML email brandés Fidlify (dark theme + accent).
 * - Compatible Gmail, Outlook, Apple Mail, ProtonMail
 * - Tables-based layout (max compatibilité), pas de Flexbox
 * - Texte alternatif fourni en parallèle
 */

const ACCENT = "#d4ff4e";
const BG = "#0c0d0c";
const INK = "#f4f5f1";
const INK_2 = "#c9ccc3";
const LINE = "rgba(255, 255, 255, 0.10)";

export function verificationCodeEmail({
  code,
  ttlMinutes,
}: {
  code: string;
  ttlMinutes: number;
}): { subject: string; html: string; text: string } {
  const subject = `Votre code de vérification Fidlify : ${code}`;

  const text = [
    `Bienvenue sur Fidlify !`,
    ``,
    `Votre code de vérification : ${code}`,
    ``,
    `Ce code est valable ${ttlMinutes} minutes.`,
    `Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
    ``,
    `— L'équipe Fidlify`,
    `https://www.fidlify.com`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#070707;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${INK};">
  <div style="display:none;max-height:0;overflow:hidden;color:transparent;">
    Votre code de vérification Fidlify : ${code}. Valable ${ttlMinutes} minutes.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#070707;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${BG};border:1px solid ${LINE};border-radius:18px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 8px;">
              <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;color:${ACCENT};font-weight:600;">FIDLIFY</div>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding:8px 32px 4px;">
              <h1 style="margin:0;font-size:24px;line-height:1.25;font-weight:600;letter-spacing:-0.01em;color:${INK};">
                Confirmez votre adresse email
              </h1>
            </td>
          </tr>

          <!-- Lede -->
          <tr>
            <td style="padding:8px 32px 24px;">
              <p style="margin:0;font-size:15px;line-height:1.6;color:${INK_2};">
                Bienvenue sur Fidlify. Pour finaliser votre inscription, saisissez le code ci-dessous dans la page de vérification ouverte sur votre navigateur.
              </p>
            </td>
          </tr>

          <!-- Code box -->
          <tr>
            <td align="center" style="padding:8px 32px 8px;">
              <div style="display:inline-block;padding:22px 32px;background:rgba(212,255,78,0.08);border:1px solid rgba(212,255,78,0.3);border-radius:14px;">
                <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:36px;letter-spacing:0.32em;color:${ACCENT};font-weight:600;">
                  ${code}
                </div>
              </div>
            </td>
          </tr>

          <!-- TTL -->
          <tr>
            <td align="center" style="padding:14px 32px 24px;">
              <p style="margin:0;font-size:13px;color:#8a8e84;">
                Code valable <strong style="color:${INK_2};">${ttlMinutes} minutes</strong>.
              </p>
            </td>
          </tr>

          <!-- Separator -->
          <tr>
            <td style="padding:0 32px;">
              <div style="height:1px;background:${LINE};"></div>
            </td>
          </tr>

          <!-- Security note -->
          <tr>
            <td style="padding:24px 32px 32px;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#8a8e84;">
                Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message en toute sécurité.
                Personne ne pourra accéder à votre compte sans ce code.
              </p>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;margin-top:24px;">
          <tr>
            <td align="center" style="padding:0 16px;">
              <p style="margin:0;font-size:11px;line-height:1.6;color:#565a52;letter-spacing:0.04em;">
                © ${new Date().getFullYear()} FIDLIFY · Conçu en Suisse romande 🇨🇭
                <br />
                <a href="https://www.fidlify.com" style="color:#8a8e84;text-decoration:none;">www.fidlify.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

/**
 * Email de récupération de carte de fidélité.
 * Envoyé automatiquement quand un client tente de s'inscrire à un programme
 * pour lequel il a déjà une carte (privacy-safe : aucun leak via la réponse API).
 */
export function recoveryEmail({
  firstName,
  programName,
  merchantName,
  recoveryUrl,
}: {
  firstName: string;
  programName: string;
  merchantName: string;
  recoveryUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Récupérez votre carte de fidélité ${programName}`;

  const text = [
    `Bonjour ${firstName},`,
    ``,
    `Vous avez déjà une carte de fidélité pour ${programName} chez ${merchantName}.`,
    ``,
    `Pour la réinstaller dans votre Wallet (avec votre progression intacte), cliquez sur le lien ci-dessous :`,
    recoveryUrl,
    ``,
    `Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
    ``,
    `— L'équipe Fidlify`,
    `https://www.fidlify.com`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#070707;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${INK};">
  <div style="display:none;max-height:0;overflow:hidden;color:transparent;">
    Votre carte de fidélité ${programName} existe déjà — cliquez pour la réinstaller dans votre Wallet.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#070707;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${BG};border:1px solid ${LINE};border-radius:18px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 8px;">
              <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;color:${ACCENT};font-weight:600;">FIDLIFY</div>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding:8px 32px 4px;">
              <h1 style="margin:0;font-size:22px;line-height:1.3;font-weight:600;letter-spacing:-0.01em;color:${INK};">
                Bonjour ${firstName} 👋
              </h1>
            </td>
          </tr>

          <!-- Lede -->
          <tr>
            <td style="padding:14px 32px 24px;">
              <p style="margin:0;font-size:15px;line-height:1.65;color:${INK_2};">
                Vous avez déjà une carte de fidélité pour <strong style="color:${INK};">${programName}</strong> chez ${merchantName}.
                Si vous l'avez perdue (suppression du Wallet, changement de téléphone), cliquez ci-dessous pour la réinstaller.
                <strong style="color:${INK};">Votre progression est conservée.</strong>
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:8px 32px 8px;">
              <a href="${recoveryUrl}" style="display:inline-block;padding:14px 28px;background:${ACCENT};color:#0a0d04;border-radius:999px;font-weight:600;text-decoration:none;font-size:14px;letter-spacing:0.01em;">
                Réinstaller ma carte
              </a>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td style="padding:18px 32px 8px;">
              <p style="margin:0;font-size:12px;color:#8a8e84;line-height:1.6;">
                Lien direct (si le bouton ne fonctionne pas) :
              </p>
              <p style="margin:4px 0 0;font-size:12px;color:#c9ccc3;word-break:break-all;font-family:'SF Mono',Menlo,Consolas,monospace;">
                ${recoveryUrl}
              </p>
            </td>
          </tr>

          <!-- Separator -->
          <tr>
            <td style="padding:20px 32px 0;">
              <div style="height:1px;background:${LINE};"></div>
            </td>
          </tr>

          <!-- Security note -->
          <tr>
            <td style="padding:20px 32px 32px;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#8a8e84;">
                Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message en toute sécurité.
                Ce lien est unique à votre carte et ne donne accès à aucune information sensible.
              </p>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;margin-top:24px;">
          <tr>
            <td align="center" style="padding:0 16px;">
              <p style="margin:0;font-size:11px;line-height:1.6;color:#565a52;letter-spacing:0.04em;">
                © ${new Date().getFullYear()} FIDLIFY · Conçu en Suisse romande 🇨🇭
                <br />
                <a href="https://www.fidlify.com" style="color:#8a8e84;text-decoration:none;">www.fidlify.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

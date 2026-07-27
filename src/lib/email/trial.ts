import { getFromAddress, getTransporter } from "./transport";

/**
 * Relances d'essai (J-7, J-2, J+1).
 *
 * Sans relance, une bonne partie des essais expirent sans que le commerçant
 * s'en aperçoive : il ne décide pas de ne pas payer, il ne voit simplement
 * pas passer l'échéance.
 *
 * Le ton reste factuel et rassurant : à l'expiration, les cartes déjà
 * installées chez ses clients continuent de fonctionner. On ne joue pas sur
 * la peur de « tout perdre », ce serait faux.
 */

const ACCENT = "#d4ff4e";
const BG = "#0c0d0c";
const INK = "#f4f5f1";
const INK_2 = "#c9ccc3";
const LINE = "rgba(255, 255, 255, 0.10)";

export type TrialStage = "J7" | "J2" | "END";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.fidlify.com";

function layout({
  title,
  intro,
  body,
  ctaLabel,
}: {
  title: string;
  intro: string;
  body: string;
  ctaLabel: string;
}): string {
  const url = `${APP_URL}/dashboard/settings`;
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#111311;border:1px solid ${LINE};border-radius:16px;padding:32px;">
        <tr><td style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:${ACCENT};font-weight:700;">Fidlify</td></tr>
        <tr><td style="padding-top:14px;font-size:22px;font-weight:700;line-height:1.25;color:${INK};">${title}</td></tr>
        <tr><td style="padding-top:14px;font-size:15px;line-height:1.6;color:${INK_2};">${intro}</td></tr>
        <tr><td style="padding-top:14px;font-size:15px;line-height:1.6;color:${INK_2};">${body}</td></tr>
        <tr><td style="padding-top:26px;">
          <a href="${url}" style="display:inline-block;background:${ACCENT};color:#0a0d04;font-weight:700;font-size:15px;text-decoration:none;padding:13px 22px;border-radius:10px;">${ctaLabel}</a>
        </td></tr>
        <tr><td style="padding-top:26px;font-size:12px;line-height:1.6;color:#8a8e84;border-top:1px solid ${LINE};">
          Vous recevez cet e-mail car vous avez créé un compte Fidlify.<br />
          <a href="${APP_URL}" style="color:#8a8e84;">www.fidlify.com</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function trialEmail(stage: TrialStage, firstName: string) {
  const hello = firstName ? `Bonjour ${firstName},` : "Bonjour,";

  if (stage === "J7") {
    const subject = "Votre essai Fidlify se termine dans 7 jours";
    return {
      subject,
      html: layout({
        title: "Encore 7 jours d'essai",
        intro: `${hello} il vous reste une semaine pour profiter de Fidlify en entier.`,
        body:
          "C'est le bon moment pour lancer une campagne si ce n'est pas déjà fait : " +
          "c'est là qu'on voit le mieux l'effet — des clients qui reviennent dans les jours qui suivent.",
        ctaLabel: "Voir mon tableau de bord",
      }),
      text: [
        hello,
        "",
        "Il vous reste 7 jours d'essai Fidlify.",
        "C'est le bon moment pour lancer une campagne : c'est là qu'on voit le mieux l'effet, des clients qui reviennent dans les jours qui suivent.",
        "",
        `${APP_URL}/dashboard/settings`,
        "",
        "— L'équipe Fidlify",
      ].join("\n"),
    };
  }

  if (stage === "J2") {
    const subject = "Votre essai Fidlify se termine après-demain";
    return {
      subject,
      html: layout({
        title: "Plus que 2 jours",
        intro: `${hello} votre essai se termine dans deux jours.`,
        body:
          "Rassurez-vous : les cartes déjà installées chez vos clients continueront de fonctionner. " +
          "Ce que vous perdrez, c'est la possibilité d'enregistrer de nouveaux clients et d'envoyer des campagnes.",
        ctaLabel: "Choisir un plan",
      }),
      text: [
        hello,
        "",
        "Votre essai Fidlify se termine dans 2 jours.",
        "Les cartes déjà installées chez vos clients continueront de fonctionner. Vous perdrez en revanche la possibilité d'enregistrer de nouveaux clients et d'envoyer des campagnes.",
        "",
        `${APP_URL}/dashboard/settings`,
        "",
        "— L'équipe Fidlify",
      ].join("\n"),
    };
  }

  const subject = "Votre essai Fidlify est terminé";
  return {
    subject,
    html: layout({
      title: "Votre programme est en pause",
      intro: `${hello} votre essai s'est terminé hier.`,
      body:
        "Vos clients gardent leur carte : elle fonctionne toujours et continue de cumuler des tampons. " +
        "De votre côté, l'enregistrement de nouveaux clients et l'envoi de campagnes sont suspendus " +
        "jusqu'à la souscription d'un plan. Tout repart exactement là où vous vous êtes arrêté.",
      ctaLabel: "Réactiver mon programme",
    }),
    text: [
      hello,
      "",
      "Votre essai Fidlify s'est terminé hier.",
      "Vos clients gardent leur carte : elle fonctionne toujours et continue de cumuler des tampons.",
      "L'enregistrement de nouveaux clients et l'envoi de campagnes sont suspendus jusqu'à la souscription d'un plan. Tout repart là où vous vous êtes arrêté.",
      "",
      `${APP_URL}/dashboard/settings`,
      "",
      "— L'équipe Fidlify",
    ].join("\n"),
  };
}

/** Envoie la relance. Retourne false si l'envoi n'a pas pu se faire, pour que
 *  l'appelant n'enregistre pas l'étape comme traitée. */
export async function sendTrialEmail(
  toEmail: string,
  stage: TrialStage,
  firstName: string
): Promise<boolean> {
  const transporter = getTransporter();
  const { subject, html, text } = trialEmail(stage, firstName);

  if (!transporter) {
    console.warn(`[trial] SMTP non configuré — relance ${stage} non envoyée à ${toEmail}`);
    return false;
  }

  try {
    await transporter.sendMail({ from: getFromAddress(), to: toEmail, subject, html, text });
    return true;
  } catch (error) {
    console.error(`[trial] envoi ${stage} impossible pour ${toEmail}:`, error);
    return false;
  }
}

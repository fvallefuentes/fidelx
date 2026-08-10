import { getFromAddress, getTransporter } from "@/lib/email/transport";
import type {
  WeeklyCampaignSummary,
  WeeklyMetricComparison,
} from "@/lib/campaign-weekly-summary";

const ACCENT = "#d4ff4e";
const BG = "#0c0d0c";
const PANEL = "#141613";
const PANEL_SOFT = "#10120f";
const INK = "#f4f5f1";
const INK_2 = "#c9ccc3";
const MUTED = "#8a8e84";
const LINE = "rgba(255,255,255,0.12)";

export async function sendWeeklyCampaignSummaryEmail(input: {
  toEmail: string;
  merchantName?: string | null;
  summary: WeeklyCampaignSummary;
  dashboardUrl: string;
}): Promise<{ sent: boolean; devModeNoSmtp: boolean }> {
  const transporter = getTransporter();
  const { subject, html, text } = weeklyCampaignSummaryEmail(input);

  if (!transporter) {
    console.warn(
      `[email] SMTP not configured. Weekly campaign summary for ${input.toEmail}: ${input.dashboardUrl}`
    );
    return { sent: false, devModeNoSmtp: true };
  }

  try {
    await transporter.sendMail({
      from: getFromAddress(),
      to: input.toEmail,
      subject,
      html,
      text,
    });
    return { sent: true, devModeNoSmtp: false };
  } catch (err) {
    console.error(
      "[email] sendWeeklyCampaignSummaryEmail failed:",
      (err as Error).message
    );
    return { sent: false, devModeNoSmtp: false };
  }
}

export function weeklyCampaignSummaryEmail(input: {
  merchantName?: string | null;
  summary: WeeklyCampaignSummary;
  dashboardUrl: string;
}) {
  const name = input.merchantName?.trim() || "votre commerce";
  const { summary } = input;
  const period = formatPeriod(summary.periodStart, summary.periodEnd);
  const actionUrl = summary.topOpportunity
    ? buildRecommendationUrl(input.dashboardUrl, summary.topOpportunity.id)
    : input.dashboardUrl;
  const subject = buildSubject(summary);
  const result = buildResultState(summary);
  const deliveryText = buildDeliveryText(summary);
  const attributionText = summary.attribution.resultsAreProvisional
    ? `Les retours sont mesurés pendant ${summary.attribution.windowDays} jours après chaque envoi. ${summary.attribution.pendingCampaigns} campagne${summary.attribution.pendingCampaigns > 1 ? "s ont" : " a"} encore des résultats en cours.`
    : `Les retours sont attribués pendant ${summary.attribution.windowDays} jours après chaque envoi.`;
  const bestCampaignText = summary.bestCampaign
    ? `${summary.bestCampaign.isProvisional ? "Meilleure performance provisoire" : "Meilleure campagne"} : ${summary.bestCampaign.name}, ${summary.bestCampaign.returnedClients} client${summary.bestCampaign.returnedClients > 1 ? "s" : ""} revenu${summary.bestCampaign.returnedClients > 1 ? "s" : ""} (${summary.bestCampaign.conversionRate} %).`
    : "Aucun retour mesurable pour le moment.";
  const actionText = summary.topOpportunity
    ? `${summary.topOpportunity.reason} ${summary.topOpportunity.potentialCount} client${summary.topOpportunity.potentialCount > 1 ? "s" : ""} ciblable${summary.topOpportunity.potentialCount > 1 ? "s" : ""} sur ${summary.topOpportunity.programName}.`
    : summary.nextActions[0] || "Aucune action urgente détectée cette semaine.";

  const text = [
    `Bonjour ${name},`,
    "",
    `Votre récap Fidlify du ${period}.`,
    "",
    result.title,
    result.body,
    "",
    `Notifications envoyées : ${summary.stats.notificationsSent} (${formatComparison(summary.comparisons.notificationsSent, "percent")})`,
    `Clients revenus après une notification : ${summary.stats.returnedClients} (${formatComparison(summary.comparisons.returnedClients, "absolute")})`,
    `Visites attribuées aux campagnes : ${summary.stats.generatedVisits} (${formatComparison(summary.comparisons.generatedVisits, "percent")})`,
    `Automatisations actives : ${summary.stats.automationsActive}`,
    "",
    `Livraison Wallet : ${deliveryText}`,
    attributionText,
    "",
    `Nouveaux clients : ${summary.stats.newClients} (${formatComparison(summary.comparisons.newClients, "absolute")})`,
    `Clients revenus naturellement : ${summary.stats.organicReturningClients} (${formatComparison(summary.comparisons.organicReturningClients, "absolute")})`,
    "",
    bestCampaignText,
    ...(summary.programResults.length > 1
      ? [
          "",
          "Résultats par programme :",
          ...summary.programResults.map(
            (program) =>
              `- ${program.programName}: ${program.notificationsDelivered}/${program.notificationsSent} livrées, ${program.returnedClients} retour${program.returnedClients > 1 ? "s" : ""}, ${program.generatedVisits} visite${program.generatedVisits > 1 ? "s" : ""}`
          ),
        ]
      : []),
    "",
    "Action prioritaire :",
    actionText,
    summary.topOpportunity?.estimatedRevenue !== null &&
    summary.topOpportunity?.estimatedRevenue !== undefined
      ? `Potentiel brut si tous reviennent : ${formatMoney(summary.topOpportunity.estimatedRevenue, summary.currency)}.`
      : "",
    "",
    `${summary.topOpportunity ? "Préparer la campagne" : "Ouvrir l'assistant"} : ${actionUrl}`,
    "",
    "-- L'équipe Fidlify",
  ]
    .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
    .join("\n");

  const statCards = [
    {
      label: "Notifications envoyées",
      value: String(summary.stats.notificationsSent),
      comparison: formatComparison(
        summary.comparisons.notificationsSent,
        "percent"
      ),
    },
    {
      label: "Clients revenus après une notification",
      value:
        summary.stats.returnedClients === 0
          ? "Aucun"
          : String(summary.stats.returnedClients),
      comparison: formatComparison(
        summary.comparisons.returnedClients,
        "absolute"
      ),
    },
    {
      label: "Visites attribuées aux campagnes",
      value:
        summary.stats.generatedVisits === 0
          ? "Aucune"
          : String(summary.stats.generatedVisits),
      comparison: formatComparison(
        summary.comparisons.generatedVisits,
        "percent"
      ),
    },
    {
      label: "Automatisations actives",
      value: String(summary.stats.automationsActive),
      comparison: "Suivi récurrent",
    },
  ]
    .map(
      (stat) => `
        <td class="stat-cell" style="width:50%;padding:7px;vertical-align:top;">
          <div style="min-height:104px;background:${PANEL};border:1px solid ${LINE};border-radius:10px;padding:16px;box-sizing:border-box;">
            <div style="font-size:${stat.value.length > 4 ? "20px" : "25px"};line-height:1.1;font-weight:750;color:${INK};">${escapeHtml(stat.value)}</div>
            <div style="margin-top:7px;font-size:12px;line-height:1.35;color:${INK_2};">${escapeHtml(stat.label)}</div>
            <div style="margin-top:8px;font-size:11px;color:${MUTED};">${escapeHtml(stat.comparison)}</div>
          </div>
        </td>`
    )
    .reduce((rows, cell, index) => {
      if (index % 2 === 0) rows.push([]);
      rows[rows.length - 1].push(cell);
      return rows;
    }, [] as string[][])
    .map((cells) => `<tr>${cells.join("")}</tr>`)
    .join("");

  const deliveryHtml = `
    <div style="background:${PANEL_SOFT};border:1px solid ${LINE};border-radius:10px;padding:17px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="font-size:13px;font-weight:700;color:${INK};">Livraison Wallet</td>
          <td align="right" style="font-size:13px;font-weight:750;color:${ACCENT};">${summary.stats.deliveryRate} % livrées</td>
        </tr>
      </table>
      <p style="margin:9px 0 0;font-size:13px;line-height:1.55;color:${INK_2};">${escapeHtml(deliveryText)}</p>
    </div>`;

  const activityHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        ${renderActivityCell(
          "Nouveaux clients",
          summary.stats.newClients,
          formatComparison(summary.comparisons.newClients, "absolute")
        )}
        ${renderActivityCell(
          "Revenus naturellement",
          summary.stats.organicReturningClients,
          formatComparison(
            summary.comparisons.organicReturningClients,
            "absolute"
          )
        )}
      </tr>
    </table>`;

  const programsHtml =
    summary.programResults.length > 1
      ? `<tr>
          <td style="padding:6px 30px 18px;">
            <h2 style="margin:0 0 12px;font-size:15px;color:${INK};">Résultats par programme</h2>
            <div style="border:1px solid ${LINE};border-radius:10px;overflow:hidden;">
              ${summary.programResults
                .map(
                  (program, index) => `
                    <div style="padding:13px 15px;${index > 0 ? `border-top:1px solid ${LINE};` : ""}">
                      <div style="font-size:13px;font-weight:700;color:${INK};">${escapeHtml(program.programName)}</div>
                      <div style="margin-top:5px;font-size:12px;line-height:1.5;color:${MUTED};">
                        ${program.notificationsDelivered}/${program.notificationsSent} livrées ·
                        ${program.returnedClients === 0 ? "Aucun retour" : `${program.returnedClients} retour${program.returnedClients > 1 ? "s" : ""}`} ·
                        ${program.generatedVisits === 0 ? "Aucune visite attribuée" : `${program.generatedVisits} visite${program.generatedVisits > 1 ? "s" : ""} attribuée${program.generatedVisits > 1 ? "s" : ""}`}
                        ${program.resultsAreProvisional ? " · Résultats en cours" : ""}
                      </div>
                    </div>`
                )
                .join("")}
            </div>
          </td>
        </tr>`
      : "";

  const bestCampaignHtml = summary.bestCampaign
    ? `<div style="margin-top:12px;padding:13px 15px;border-left:3px solid ${ACCENT};background:${PANEL_SOFT};">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:${MUTED};">${summary.bestCampaign.isProvisional ? "Meilleure performance provisoire" : "Meilleure campagne"}</div>
        <p style="margin:5px 0 0;font-size:13px;line-height:1.55;color:${INK_2};">
          <strong style="color:${INK};">${escapeHtml(summary.bestCampaign.name)}</strong> ·
          ${summary.bestCampaign.returnedClients} client${summary.bestCampaign.returnedClients > 1 ? "s" : ""} revenu${summary.bestCampaign.returnedClients > 1 ? "s" : ""} ·
          ${summary.bestCampaign.conversionRate} %
        </p>
      </div>`
    : `<p style="margin:12px 0 0;font-size:13px;color:${INK_2};">Aucun retour mesurable pour le moment.</p>`;

  const opportunityHtml = summary.topOpportunity
    ? `<div style="background:#18200e;border:1px solid rgba(212,255,78,0.35);border-radius:10px;padding:18px;">
        <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.12em;color:${ACCENT};font-weight:700;">ACTION PRIORITAIRE</div>
        <h2 style="margin:8px 0 5px;font-size:18px;line-height:1.35;color:${INK};">${escapeHtml(summary.topOpportunity.title)}</h2>
        <p style="margin:0;font-size:13px;line-height:1.6;color:${INK_2};">${escapeHtml(summary.topOpportunity.reason)}</p>
        <p style="margin:10px 0 0;font-size:13px;color:${INK};"><strong>${summary.topOpportunity.potentialCount} client${summary.topOpportunity.potentialCount > 1 ? "s" : ""} ciblable${summary.topOpportunity.potentialCount > 1 ? "s" : ""}</strong> sur ${escapeHtml(summary.topOpportunity.programName)}</p>
        ${
          summary.topOpportunity.estimatedRevenue !== null
            ? `<p style="margin:6px 0 0;font-size:12px;color:${MUTED};">Jusqu'à ${escapeHtml(formatMoney(summary.topOpportunity.estimatedRevenue, summary.currency))} de passages potentiels si tous reviennent, selon votre panier moyen renseigné.</p>`
            : ""
        }
      </div>`
    : `<div style="background:${PANEL_SOFT};border:1px solid ${LINE};border-radius:10px;padding:18px;">
        <div style="font-size:13px;font-weight:700;color:${INK};">Aucune action urgente</div>
        <p style="margin:6px 0 0;font-size:13px;line-height:1.55;color:${INK_2};">${escapeHtml(summary.nextActions[0] || "Fidlify continue de surveiller vos opportunités.")}</p>
      </div>`;

  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
  <style>
    @media only screen and (max-width: 520px) {
      .email-shell { border-radius: 0 !important; }
      .email-pad { padding-left: 20px !important; padding-right: 20px !important; }
      .stat-cell { display: block !important; width: 100% !important; box-sizing: border-box !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#070707;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${INK};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(result.title)} · ${escapeHtml(deliveryText)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#070707;">
    <tr>
      <td align="center" style="padding:40px 14px;">
        <table class="email-shell" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background:${BG};border:1px solid ${LINE};border-radius:14px;overflow:hidden;">
          <tr>
            <td class="email-pad" style="padding:28px 30px 7px;">
              <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.16em;color:${ACCENT};font-weight:700;">FIDLIFY ASSISTANT</div>
            </td>
          </tr>
          <tr>
            <td class="email-pad" style="padding:8px 30px 5px;">
              <h1 style="margin:0;font-size:26px;line-height:1.25;font-weight:750;color:${INK};">Votre récap de la semaine</h1>
            </td>
          </tr>
          <tr>
            <td class="email-pad" style="padding:7px 30px 20px;">
              <p style="margin:0;font-size:14px;line-height:1.65;color:${INK_2};">Bonjour ${escapeHtml(name)}, voici ce que Fidlify a observé du ${escapeHtml(period)}.</p>
            </td>
          </tr>
          <tr>
            <td class="email-pad" style="padding:0 30px 14px;">
              <div style="background:${summary.stats.returnedClients > 0 ? "#18200e" : PANEL_SOFT};border:1px solid ${summary.stats.returnedClients > 0 ? "rgba(212,255,78,0.35)" : LINE};border-radius:10px;padding:17px 18px;">
                <div style="font-size:17px;line-height:1.35;font-weight:750;color:${INK};">${escapeHtml(result.title)}</div>
                <p style="margin:6px 0 0;font-size:13px;line-height:1.55;color:${INK_2};">${escapeHtml(result.body)}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 22px 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${statCards}</table>
            </td>
          </tr>
          <tr>
            <td class="email-pad" style="padding:4px 30px 16px;">${deliveryHtml}</td>
          </tr>
          <tr>
            <td class="email-pad" style="padding:0 30px 18px;">
              <div style="padding:12px 14px;background:#17140d;border:1px solid rgba(255,196,86,0.25);border-radius:9px;">
                <div style="font-size:12px;font-weight:700;color:#ffd27d;">${summary.attribution.resultsAreProvisional ? "Résultats encore en cours" : "Période d'attribution terminée"}</div>
                <p style="margin:5px 0 0;font-size:12px;line-height:1.55;color:${INK_2};">${escapeHtml(attributionText)}</p>
              </div>
              ${bestCampaignHtml}
            </td>
          </tr>
          <tr>
            <td class="email-pad" style="padding:4px 30px 8px;">
              <h2 style="margin:0 0 10px;font-size:15px;color:${INK};">Activité clients</h2>
              ${activityHtml}
            </td>
          </tr>
          ${programsHtml}
          <tr>
            <td class="email-pad" style="padding:8px 30px 8px;">${opportunityHtml}</td>
          </tr>
          <tr>
            <td align="center" class="email-pad" style="padding:16px 30px 32px;">
              <a href="${escapeAttribute(actionUrl)}" style="display:block;padding:14px 20px;background:${ACCENT};color:#0a0d04;border-radius:8px;font-weight:750;text-decoration:none;font-size:14px;">
                ${summary.topOpportunity ? "Préparer la campagne" : "Ouvrir l'assistant"}
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;line-height:1.6;color:#565a52;">Email automatique envoyé au maximum une fois par semaine. Réglable dans vos paramètres Fidlify.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text, actionUrl };
}

function buildSubject(summary: WeeklyCampaignSummary) {
  if (summary.stats.returnedClients > 0) {
    return `Votre semaine Fidlify : ${summary.stats.returnedClients} client${summary.stats.returnedClients > 1 ? "s" : ""} revenu${summary.stats.returnedClients > 1 ? "s" : ""}`;
  }
  if (summary.attribution.resultsAreProvisional && summary.stats.notificationsSent > 0) {
    return `Votre semaine Fidlify : ${summary.stats.notificationsDelivered} notification${summary.stats.notificationsDelivered > 1 ? "s" : ""} livrée${summary.stats.notificationsDelivered > 1 ? "s" : ""}, résultats en cours`;
  }
  return summary.topOpportunity
    ? `Fidlify a détecté ${summary.topOpportunity.potentialCount} clients à cibler`
    : "Votre récap Fidlify de la semaine";
}

function buildResultState(summary: WeeklyCampaignSummary) {
  if (summary.stats.returnedClients > 0) {
    return {
      title: `${summary.stats.returnedClients} client${summary.stats.returnedClients > 1 ? "s sont" : " est"} revenu${summary.stats.returnedClients > 1 ? "s" : ""} après vos campagnes`,
      body: `${summary.stats.generatedVisits} visite${summary.stats.generatedVisits > 1 ? "s ont" : " a"} été attribuée${summary.stats.generatedVisits > 1 ? "s" : ""} aux notifications de la période.`,
    };
  }
  if (summary.attribution.resultsAreProvisional && summary.stats.notificationsSent > 0) {
    return {
      title: "Résultats encore en cours",
      body: "Aucun retour mesurable pour le moment. Les campagnes récentes disposent encore de temps pour générer une visite.",
    };
  }
  if (summary.stats.notificationsSent > 0) {
    return {
      title: "Aucun retour mesurable pour le moment",
      body: "La fenêtre d'observation est terminée. L'action proposée plus bas cible l'opportunité la plus prometteuse pour la suite.",
    };
  }
  return {
    title: "Aucune campagne envoyée cette semaine",
    body: "Fidlify continue d'analyser vos clients et vous propose l'action prioritaire disponible.",
  };
}

function buildDeliveryText(summary: WeeklyCampaignSummary) {
  const unresolved = Math.max(
    0,
    summary.stats.notificationsSent -
      summary.stats.notificationsDelivered -
      summary.stats.notificationsWithoutWallet
  );
  return [
    `${summary.stats.notificationsSent} envoyée${summary.stats.notificationsSent > 1 ? "s" : ""}`,
    `${summary.stats.notificationsDelivered} livrée${summary.stats.notificationsDelivered > 1 ? "s" : ""}`,
    `${summary.stats.notificationsWithoutWallet} sans Wallet actif`,
    ...(unresolved > 0 ? [`${unresolved} non confirmée${unresolved > 1 ? "s" : ""}`] : []),
  ].join(" · ");
}

function renderActivityCell(
  label: string,
  value: number,
  comparison: string
) {
  return `<td style="width:50%;padding:0 7px 0 0;vertical-align:top;">
    <div style="background:${PANEL};border:1px solid ${LINE};border-radius:10px;padding:14px;">
      <div style="font-size:21px;font-weight:750;color:${INK};">${value}</div>
      <div style="margin-top:5px;font-size:12px;color:${INK_2};">${escapeHtml(label)}</div>
      <div style="margin-top:7px;font-size:11px;color:${MUTED};">${escapeHtml(comparison)}</div>
    </div>
  </td>`;
}

function formatComparison(
  comparison: WeeklyMetricComparison,
  mode: "absolute" | "percent"
) {
  if (comparison.delta === 0) return "Stable vs semaine précédente";
  const sign = comparison.delta > 0 ? "+" : "";
  if (mode === "percent" && comparison.percentChange !== null) {
    return `${sign}${formatNumber(comparison.percentChange)} % vs semaine précédente`;
  }
  return `${sign}${comparison.delta} vs semaine précédente`;
}

function buildRecommendationUrl(baseUrl: string, recommendationId: string) {
  const url = new URL(baseUrl);
  url.searchParams.set("prepare", recommendationId);
  return url.toString();
}

function formatPeriod(startIso: string, endIso: string) {
  const formatter = new Intl.DateTimeFormat("fr-CH", {
    day: "2-digit",
    month: "2-digit",
  });
  return `${formatter.format(new Date(startIso))} au ${formatter.format(
    new Date(endIso)
  )}`;
}

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("fr-CH", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${Math.round(value)} ${currency}`;
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-CH", {
    maximumFractionDigits: 1,
  }).format(value);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

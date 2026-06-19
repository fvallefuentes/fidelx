import { getFromAddress, getTransporter } from "@/lib/email/transport";
import type { WeeklyCampaignSummary } from "@/lib/campaign-weekly-summary";

const ACCENT = "#d4ff4e";
const BG = "#0c0d0c";
const PANEL = "#141613";
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
    console.error("[email] sendWeeklyCampaignSummaryEmail failed:", (err as Error).message);
    return { sent: false, devModeNoSmtp: false };
  }
}

function weeklyCampaignSummaryEmail(input: {
  merchantName?: string | null;
  summary: WeeklyCampaignSummary;
  dashboardUrl: string;
}) {
  const name = input.merchantName?.trim() || "Bonjour";
  const { summary } = input;
  const subject =
    summary.stats.messagesSent > 0
      ? `Votre semaine Fidlify: ${summary.stats.returnedClients} client${summary.stats.returnedClients > 1 ? "s" : ""} revenu${summary.stats.returnedClients > 1 ? "s" : ""}`
      : "Votre assistant Fidlify a des actions a proposer";
  const period = formatPeriod(summary.periodStart, summary.periodEnd);
  const stats = [
    `${summary.stats.messagesSent} messages envoyes`,
    `${summary.stats.returnedClients} clients revenus`,
    `${summary.stats.generatedVisits} visites attribuees`,
    `${summary.stats.automationsActive} automatisations actives`,
  ];
  const text = [
    `${name},`,
    "",
    `Voici le recap Fidlify de la semaine (${period}).`,
    "",
    ...stats.map((stat) => `- ${stat}`),
    "",
    "A retenir:",
    ...summary.highlights.map((item) => `- ${item}`),
    "",
    "Prochaines actions:",
    ...summary.nextActions.map((item) => `- ${item}`),
    "",
    `Ouvrir l'assistant: ${input.dashboardUrl}`,
    "",
    "-- L'equipe Fidlify",
  ].join("\n");

  const statCards = [
    ["Messages", summary.stats.messagesSent],
    ["Retours", summary.stats.returnedClients],
    ["Visites", summary.stats.generatedVisits],
    ["Autos", summary.stats.automationsActive],
  ]
    .map(
      ([label, value]) => `
        <td style="width:50%;padding:8px;">
          <div style="background:${PANEL};border:1px solid ${LINE};border-radius:14px;padding:16px;">
            <div style="font-size:24px;line-height:1;font-weight:700;color:${INK};">${value}</div>
            <div style="margin-top:6px;font-size:12px;color:${MUTED};">${label}</div>
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

  const highlightsHtml = renderList(summary.highlights);
  const actionsHtml = renderList(summary.nextActions);
  const bestCampaignHtml = summary.bestCampaign
    ? `<p style="margin:0;font-size:14px;line-height:1.6;color:${INK_2};">
        Meilleure campagne: <strong style="color:${INK};">${escapeHtml(summary.bestCampaign.name)}</strong>
        (${summary.bestCampaign.returnedClients} retour${summary.bestCampaign.returnedClients > 1 ? "s" : ""},
        ${summary.bestCampaign.conversionRate}%).
      </p>`
    : "";
  const opportunityHtml = summary.topOpportunity
    ? `<p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:${INK_2};">
        Opportunite: <strong style="color:${INK};">${escapeHtml(summary.topOpportunity.title)}</strong>
        pour ${summary.topOpportunity.potentialCount} client${summary.topOpportunity.potentialCount > 1 ? "s" : ""}
        sur ${escapeHtml(summary.topOpportunity.programName)}.
      </p>`
    : "";

  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#070707;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#070707;">
    <tr>
      <td align="center" style="padding:44px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background:${BG};border:1px solid ${LINE};border-radius:18px;overflow:hidden;">
          <tr>
            <td style="padding:30px 30px 8px;">
              <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;color:${ACCENT};font-weight:700;">FIDLIFY ASSISTANT</div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 30px 6px;">
              <h1 style="margin:0;font-size:26px;line-height:1.25;font-weight:700;color:${INK};">
                Votre recap de la semaine
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 30px 22px;">
              <p style="margin:0;font-size:15px;line-height:1.65;color:${INK_2};">
                ${escapeHtml(name)}, voici ce que Fidlify a observe du ${escapeHtml(period)}.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 22px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${statCards}</table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 30px 0;">
              <div style="height:1px;background:${LINE};"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 30px 6px;">
              <h2 style="margin:0 0 12px;font-size:15px;color:${INK};">A retenir</h2>
              ${highlightsHtml}
              ${bestCampaignHtml}
              ${opportunityHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:12px 30px 4px;">
              <h2 style="margin:0 0 12px;font-size:15px;color:${INK};">Prochaines actions</h2>
              ${actionsHtml}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 30px 34px;">
              <a href="${escapeAttribute(input.dashboardUrl)}" style="display:inline-block;padding:14px 24px;background:${ACCENT};color:#0a0d04;border-radius:999px;font-weight:700;text-decoration:none;font-size:14px;">
                Ouvrir l'assistant
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:18px 0 0;font-size:11px;line-height:1.6;color:#565a52;">
          Email automatique envoye au maximum une fois par semaine.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

function renderList(items: string[]) {
  if (items.length === 0) {
    return `<p style="margin:0;font-size:14px;color:${MUTED};">Aucune donnee notable pour cette periode.</p>`;
  }
  return `<ul style="margin:0 0 10px;padding:0;list-style:none;">${items
    .map(
      (item) => `<li style="margin:0 0 8px;padding-left:18px;font-size:14px;line-height:1.55;color:${INK_2};">
        <span style="color:${ACCENT};margin-left:-18px;">-</span> ${escapeHtml(item)}
      </li>`
    )
    .join("")}</ul>`;
}

function formatPeriod(startIso: string, endIso: string) {
  const formatter = new Intl.DateTimeFormat("fr-CH", {
    day: "2-digit",
    month: "2-digit",
  });
  return `${formatter.format(new Date(startIso))} au ${formatter.format(new Date(endIso))}`;
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

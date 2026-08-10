import { describe, expect, it } from "vitest";
import type { WeeklyCampaignSummary } from "@/lib/campaign-weekly-summary";
import { weeklyCampaignSummaryEmail } from "@/lib/email/weekly-campaign-summary";

function buildSummary(): WeeklyCampaignSummary {
  return {
    periodStart: "2026-08-03T09:00:00.000Z",
    periodEnd: "2026-08-10T09:00:00.000Z",
    currency: "CHF",
    attribution: {
      windowDays: 7,
      pendingCampaigns: 2,
      resultsAreProvisional: true,
    },
    stats: {
      messagesSent: 8,
      notificationsSent: 8,
      notificationsDelivered: 7,
      notificationsWithoutWallet: 1,
      deliveryRate: 87.5,
      returnedClients: 0,
      generatedVisits: 0,
      rewardsUnlocked: 0,
      campaignsSent: 2,
      automationsActive: 0,
      abTestsRun: 0,
      newClients: 3,
      organicReturningClients: 2,
    },
    comparisons: {
      notificationsSent: { previous: 5, delta: 3, percentChange: 60 },
      returnedClients: { previous: 0, delta: 0, percentChange: null },
      generatedVisits: { previous: 0, delta: 0, percentChange: null },
      newClients: { previous: 1, delta: 2, percentChange: 200 },
      organicReturningClients: {
        previous: 3,
        delta: -1,
        percentChange: -33.3,
      },
    },
    bestCampaign: null,
    topOpportunity: {
      id: "dormant-program-1",
      title: "Relancer les clients dormants",
      reason: "8 clients sont inactifs depuis 30 jours.",
      programName: "Carte café",
      potentialCount: 8,
      estimatedRevenue: 400,
    },
    programResults: [
      {
        programId: "program-1",
        programName: "Carte café",
        notificationsSent: 5,
        notificationsDelivered: 4,
        returnedClients: 0,
        generatedVisits: 0,
        resultsAreProvisional: true,
      },
      {
        programId: "program-2",
        programName: "Offre déjeuner",
        notificationsSent: 3,
        notificationsDelivered: 3,
        returnedClients: 0,
        generatedVisits: 0,
        resultsAreProvisional: true,
      },
    ],
    highlights: [
      "7 notifications livrées sur 8 envoyées.",
      "Aucun retour mesurable pour le moment.",
    ],
    nextActions: [
      "8 clients ciblables : relancer les clients dormants sur Carte café.",
    ],
  };
}

describe("weekly campaign summary email", () => {
  it("explains provisional results and delivery without naming a zero-return winner", () => {
    const result = weeklyCampaignSummaryEmail({
      merchantName: "Café du commerce",
      summary: buildSummary(),
      dashboardUrl: "https://www.fidlify.com/dashboard/assistant",
    });

    expect(result.html).toContain("Votre récap de la semaine");
    expect(result.html).toContain("voici ce que Fidlify a observé");
    expect(result.html).toContain("Résultats encore en cours");
    expect(result.html).toContain("Aucun retour mesurable pour le moment");
    expect(result.html).not.toContain("Meilleure campagne");
    expect(result.html).toContain("Notifications envoyées");
    expect(result.html).toContain("Clients revenus après une notification");
    expect(result.html).toContain("Visites attribuées aux campagnes");
    expect(result.html).toContain("Automatisations actives");
    expect(result.html).toContain(
      "8 envoyées · 7 livrées · 1 sans Wallet actif"
    );
  });

  it("adds comparisons, program results and a prefilled campaign action", () => {
    const result = weeklyCampaignSummaryEmail({
      merchantName: "Café du commerce",
      summary: buildSummary(),
      dashboardUrl: "https://www.fidlify.com/dashboard/assistant",
    });

    expect(result.html).toContain("+60 % vs semaine précédente");
    expect(result.html).toContain("Résultats par programme");
    expect(result.html).toContain("Carte café");
    expect(result.html).toContain("Offre déjeuner");
    expect(result.html).toContain("3</div>");
    expect(result.html).toContain("Revenus naturellement");
    expect(result.html).toContain("8 clients sont inactifs depuis 30 jours.");
    expect(result.html).toContain("Préparer la campagne");
    expect(result.actionUrl).toBe(
      "https://www.fidlify.com/dashboard/assistant?prepare=dormant-program-1"
    );
  });
});

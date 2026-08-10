import { describe, expect, it } from "vitest";
import {
  buildMetricComparison,
  calculateUniqueCampaignAttribution,
  isAttributionComplete,
} from "@/lib/campaign-weekly-summary";

describe("weekly campaign summary metrics", () => {
  it("compares a metric with the previous week", () => {
    expect(buildMetricComparison(12, 10)).toEqual({
      previous: 10,
      delta: 2,
      percentChange: 20,
    });
    expect(buildMetricComparison(7, 10)).toEqual({
      previous: 10,
      delta: -3,
      percentChange: -30,
    });
  });

  it("does not invent a percentage without a previous baseline", () => {
    expect(buildMetricComparison(8, 0)).toEqual({
      previous: 0,
      delta: 8,
      percentChange: null,
    });
  });

  it("keeps campaign results provisional for seven full days", () => {
    const now = new Date("2026-08-10T09:00:00.000Z");
    expect(
      isAttributionComplete(
        new Date("2026-08-03T09:00:01.000Z"),
        now
      )
    ).toBe(false);
    expect(
      isAttributionComplete(
        new Date("2026-08-03T09:00:00.000Z"),
        now
      )
    ).toBe(true);
  });

  it("counts one visit once when several campaigns preceded it", () => {
    const deliveredAt = new Date("2026-08-05T09:00:00.000Z");
    const campaigns = [
      {
        logs: [
          {
            cardId: "card-1",
            delivered: true,
            deliveredAt,
          },
        ],
      },
      {
        logs: [
          {
            cardId: "card-1",
            delivered: true,
            deliveredAt: new Date("2026-08-06T09:00:00.000Z"),
          },
        ],
      },
    ];
    const transactions = [
      {
        cardId: "card-1",
        createdAt: new Date("2026-08-07T09:00:00.000Z"),
        card: { clientId: "client-1" },
      },
    ];

    expect(
      calculateUniqueCampaignAttribution(campaigns, transactions)
    ).toEqual({ returnedClients: 1, generatedVisits: 1 });
  });
});

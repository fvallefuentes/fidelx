import { describe, expect, it } from "vitest";
import {
  buildRewardCompletionNotification,
  didEnterRewardProximity,
  findUpcomingRewardThreshold,
  selectStampTriggeredCampaign,
} from "@/lib/campaign-event-rules";

describe("stamp-triggered campaign rules", () => {
  it("builds a visible completed-card notification with the reward", () => {
    expect(buildRewardCompletionNotification("  Un café   offert ")).toEqual({
      title: "Récompense débloquée 🎉",
      message:
        "Carte complète ! Votre récompense « Un café offert » est disponible. Présentez votre carte en caisse.",
    });
  });

  it("builds a useful fallback when no reward name is configured", () => {
    expect(buildRewardCompletionNotification().message).toBe(
      "Carte complète ! Votre récompense est disponible. Présentez votre carte en caisse."
    );
  });

  it("finds the next stamp reward, including the program maximum", () => {
    expect(findUpcomingRewardThreshold({
      programType: "STAMPS",
      programConfig: { maxStamps: 10 },
      rewardThresholds: [5, 10],
      progressBefore: 5,
    })).toBe(10);
  });

  it("finds the next points tier", () => {
    expect(findUpcomingRewardThreshold({
      programType: "POINTS",
      programConfig: { tiers: [{ points: 100 }, { points: 250 }] },
      rewardThresholds: [],
      progressBefore: 120,
    })).toBe(250);
  });

  it("triggers one unit before the reward by default", () => {
    expect(didEnterRewardProximity({
      before: 8,
      after: 9,
      upcomingRewardThreshold: 10,
    }, {})).toBe(true);
  });

  it("does not send a near-reward message when the scan unlocks the reward", () => {
    expect(didEnterRewardProximity({
      before: 8,
      after: 10,
      upcomingRewardThreshold: 10,
    }, {})).toBe(false);
  });

  it("supports legacy explicit milestones", () => {
    expect(didEnterRewardProximity({
      before: 4,
      after: 5,
      upcomingRewardThreshold: 10,
    }, { stampsReached: 5 })).toBe(true);
  });

  it("prioritizes the reward milestone over the generic post-stamp message", () => {
    const postStamp = { id: "post", triggerType: "POST_STAMP" as const, triggerConfig: {} };
    const milestone = { id: "milestone", triggerType: "MILESTONE" as const, triggerConfig: {} };

    expect(selectStampTriggeredCampaign(
      [postStamp, milestone],
      { before: 8, after: 9, upcomingRewardThreshold: 10 }
    )?.id).toBe("milestone");
  });

  it("uses the post-stamp campaign outside a milestone", () => {
    const postStamp = { id: "post", triggerType: "POST_STAMP" as const, triggerConfig: {} };
    const milestone = { id: "milestone", triggerType: "MILESTONE" as const, triggerConfig: {} };

    expect(selectStampTriggeredCampaign(
      [postStamp, milestone],
      { before: 3, after: 4, upcomingRewardThreshold: 10 }
    )?.id).toBe("post");
  });
});

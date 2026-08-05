import { describe, expect, it } from "vitest";
import { splitAppleOfferText } from "@/lib/wallet/apple-offer";

describe("splitAppleOfferText", () => {
  it("keeps a short offer on one line", () => {
    expect(splitAppleOfferText("Une boisson offerte")).toEqual({
      firstLine: "Une boisson offerte",
      secondLine: "",
    });
  });

  it("splits a long offer at a word boundary", () => {
    const result = splitAppleOfferText(
      "Revenez cette semaine et profitez de votre offre spéciale en boutique"
    );

    expect(result.firstLine.length).toBeLessThanOrEqual(34);
    expect(result.firstLine.endsWith(" ")).toBe(false);
    expect(result.secondLine).toContain("offre spéciale");
  });

  it("normalizes merchant-provided line breaks and whitespace", () => {
    const result = splitAppleOfferText("  Une offre\n\n rien que   pour vous  ");
    expect(`${result.firstLine} ${result.secondLine}`.trim()).toBe(
      "Une offre rien que pour vous"
    );
  });

  it("adds an ellipsis when the front cannot show the full message", () => {
    const result = splitAppleOfferText("mot ".repeat(60));
    expect(result.secondLine.endsWith("…")).toBe(true);
  });
});

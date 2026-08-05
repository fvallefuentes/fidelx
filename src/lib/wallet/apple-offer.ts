export type AppleOfferLines = {
  firstLine: string;
  secondLine: string;
};

const FIRST_LINE_MAX = 34;
const SECOND_LINE_MAX = 62;

function cutAtWord(text: string, maxLength: number): [string, string] {
  if (text.length <= maxLength) return [text, ""];

  const candidate = text.slice(0, maxLength + 1);
  const wordBoundary = candidate.lastIndexOf(" ");
  const cutAt = wordBoundary >= Math.floor(maxLength * 0.55)
    ? wordBoundary
    : maxLength;

  return [text.slice(0, cutAt).trim(), text.slice(cutAt).trim()];
}

export function splitAppleOfferText(
  value: string | null | undefined
): AppleOfferLines {
  const normalized = value?.replace(/\s+/g, " ").trim() ?? "";
  if (!normalized) return { firstLine: "", secondLine: "" };

  const [firstLine, remainder] = cutAtWord(normalized, FIRST_LINE_MAX);
  if (!remainder) return { firstLine, secondLine: "" };

  const [visibleRemainder, hiddenRemainder] = cutAtWord(
    remainder,
    SECOND_LINE_MAX - 1
  );

  return {
    firstLine,
    secondLine: hiddenRemainder ? `${visibleRemainder}…` : visibleRemainder,
  };
}

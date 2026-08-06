/**
 * Date de la dernière modification structurelle du fichier pass.json.
 *
 * Apple compare ce marqueur aux dates déjà synchronisées par l'iPhone.
 * Il faut l'avancer lorsqu'une évolution du générateur doit forcer le
 * retéléchargement des passes, même si la carte ou le programme n'a pas été
 * modifié en base de données.
 */
export const APPLE_PASS_SCHEMA_UPDATED_AT = new Date(
  "2026-08-06T07:40:00.000Z"
);

export function getApplePassUpdatedAt(card: {
  updatedAt: Date;
  program: {
    updatedAt: Date;
    merchant: { updatedAt: Date };
    establishment?: { latitude: number | null; longitude: number | null } | null;
  };
}) {
  const hasLocation =
    typeof card.program.establishment?.latitude === "number" &&
    typeof card.program.establishment.longitude === "number";

  return new Date(
    Math.max(
      card.updatedAt.getTime(),
      card.program.updatedAt.getTime(),
      card.program.merchant.updatedAt.getTime(),
      hasLocation ? APPLE_PASS_SCHEMA_UPDATED_AT.getTime() : 0
    )
  );
}

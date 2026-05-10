/**
 * Génération CSV conforme RFC 4180, avec BOM UTF-8 pour Excel.
 *
 * - Sépare par `;` (standard FR/CH où la virgule est le séparateur décimal)
 * - Échappe quotes en doublant : "John ""Big"" Doe"
 * - Wrappe en quotes les cellules contenant `;`, `"`, `\n`, `\r`
 * - Préfixe le contenu d'un BOM UTF-8 (EF BB BF) pour Excel
 * - Datetimes en ISO 8601 (parsable par Excel/LibreOffice)
 */

const SEPARATOR = ";";
const BOM = "﻿";

export type CsvValue = string | number | boolean | Date | null | undefined;
export type CsvRow = Record<string, CsvValue>;

function escapeCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "boolean") return value ? "1" : "0";
  const str = String(value);
  if (
    str.includes(SEPARATOR) ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Génère un CSV à partir d'une liste de lignes typées + ordonnancement explicite des colonnes.
 *
 * @example
 *   toCsv(
 *     [{ name: "Marie", age: 30 }, { name: "Paul", age: 25 }],
 *     [
 *       { key: "name", header: "Prénom" },
 *       { key: "age", header: "Âge" },
 *     ]
 *   )
 */
export function toCsv<T extends CsvRow>(
  rows: T[],
  columns: { key: keyof T; header: string }[]
): string {
  const headerLine = columns.map((c) => escapeCell(c.header)).join(SEPARATOR);
  const lines = rows.map((row) =>
    columns.map((c) => escapeCell(row[c.key])).join(SEPARATOR)
  );
  return BOM + headerLine + "\n" + lines.join("\n") + (lines.length ? "\n" : "");
}

/**
 * Construit les headers HTTP pour un téléchargement CSV.
 * Utilise un Content-Disposition `attachment` avec filename horodaté.
 */
export function csvResponseHeaders(filename: string): Record<string, string> {
  const safe = filename.replace(/[^a-zA-Z0-9_\-.]/g, "_");
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${safe}"`,
    "Cache-Control": "no-store",
  };
}

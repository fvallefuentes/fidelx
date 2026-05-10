import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanLimits } from "@/lib/plan-limits";
import { csvResponseHeaders, toCsv, type CsvRow } from "@/lib/csv";

/**
 * GET /api/merchants/export/transactions
 *   ?from=YYYY-MM-DD&to=YYYY-MM-DD (optionnel, défaut : 365 derniers jours)
 * Export CSV de toutes les transactions du commerçant.
 * Réservé aux plans payants.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const merchantId =
    (session.user as { merchantId?: string }).merchantId ?? session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: merchantId },
    select: { plan: true },
  });
  const limits = getPlanLimits(user?.plan);
  if (!limits.canExportCsv) {
    return NextResponse.json(
      {
        error:
          "Export CSV réservé aux plans payants. Passez à l'offre Essentiel pour débloquer.",
      },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const defaultFrom = new Date();
  defaultFrom.setFullYear(defaultFrom.getFullYear() - 1);
  const from = fromParam ? new Date(fromParam) : defaultFrom;
  const to = toParam ? new Date(toParam) : new Date();

  const txs = await prisma.transaction.findMany({
    where: {
      card: { program: { merchantId } },
      createdAt: { gte: from, lte: to },
    },
    include: {
      card: {
        include: {
          client: { select: { firstName: true, email: true } },
          program: { select: { name: true } },
        },
      },
      establishment: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50_000, // safety cap
  });

  type Row = CsvRow & {
    date: Date;
    type: string;
    valeur: number;
    montant_chf: number | null;
    prenom: string;
    email: string;
    programme: string;
    etablissement: string;
    numero_carte: string;
    notes: string;
  };

  const rows: Row[] = txs.map((t) => ({
    date: t.createdAt,
    type: t.type,
    valeur: t.value,
    montant_chf: t.amountSpent,
    prenom: t.card.client.firstName,
    email: t.card.client.email ?? "",
    programme: t.card.program.name,
    etablissement: t.establishment?.name ?? "",
    numero_carte: t.card.serialNumber,
    notes: t.notes ?? "",
  }));

  const csv = toCsv<Row>(rows, [
    { key: "date", header: "Date" },
    { key: "type", header: "Type" },
    { key: "valeur", header: "Valeur" },
    { key: "montant_chf", header: "Montant (CHF)" },
    { key: "prenom", header: "Prénom client" },
    { key: "email", header: "Email client" },
    { key: "programme", header: "Programme" },
    { key: "etablissement", header: "Établissement" },
    { key: "numero_carte", header: "N° carte" },
    { key: "notes", header: "Notes" },
  ]);

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: csvResponseHeaders(`fidlify-transactions-${date}.csv`),
  });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanLimits } from "@/lib/plan-limits";
import { csvResponseHeaders, toCsv, type CsvRow } from "@/lib/csv";

/**
 * GET /api/merchants/export/clients
 * Export CSV de tous les clients du commerçant (1 ligne par carte).
 * Réservé aux plans payants.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const merchantId =
    (session.user as { merchantId?: string }).merchantId ?? session.user.id;

  // Plan gating
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

  const cards = await prisma.loyaltyCard.findMany({
    where: { program: { merchantId } },
    include: {
      client: {
        select: {
          firstName: true,
          email: true,
          phone: true,
          birthDate: true,
          preferredLang: true,
        },
      },
      program: { select: { name: true, type: true } },
      registrations: { select: { platform: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  type Row = CsvRow & {
    prenom: string;
    email: string;
    telephone: string;
    anniversaire: string;
    langue: string;
    programme: string;
    type: string;
    numero_carte: string;
    statut: string;
    tampons: number;
    points: number;
    cashback: number;
    visites: number;
    total_depense_chf: number;
    derniere_visite: Date | null;
    wallet_apple: number;
    wallet_google: number;
    inscrit_le: Date;
  };

  const rows: Row[] = cards.map((c) => {
    const apple = c.registrations.filter((r) => r.platform === "APPLE").length;
    const google = c.registrations.filter((r) => r.platform === "GOOGLE").length;
    return {
      prenom: c.client.firstName,
      email: c.client.email ?? "",
      telephone: c.client.phone ?? "",
      anniversaire: c.client.birthDate
        ? c.client.birthDate.toISOString().slice(0, 10)
        : "",
      langue: c.client.preferredLang,
      programme: c.program.name,
      type: c.program.type,
      numero_carte: c.serialNumber,
      statut: c.status,
      tampons: c.currentStamps,
      points: c.currentPoints,
      cashback: c.cashbackBalance,
      visites: c.totalVisits,
      total_depense_chf: c.totalSpent,
      derniere_visite: c.lastVisitAt,
      wallet_apple: apple,
      wallet_google: google,
      inscrit_le: c.createdAt,
    };
  });

  const csv = toCsv<Row>(rows, [
    { key: "prenom", header: "Prénom" },
    { key: "email", header: "Email" },
    { key: "telephone", header: "Téléphone" },
    { key: "anniversaire", header: "Anniversaire" },
    { key: "langue", header: "Langue" },
    { key: "programme", header: "Programme" },
    { key: "type", header: "Type" },
    { key: "numero_carte", header: "N° carte" },
    { key: "statut", header: "Statut" },
    { key: "tampons", header: "Tampons" },
    { key: "points", header: "Points" },
    { key: "cashback", header: "Cashback (CHF)" },
    { key: "visites", header: "Visites" },
    { key: "total_depense_chf", header: "Total dépensé (CHF)" },
    { key: "derniere_visite", header: "Dernière visite" },
    { key: "wallet_apple", header: "Wallet Apple" },
    { key: "wallet_google", header: "Wallet Google" },
    { key: "inscrit_le", header: "Inscrit le" },
  ]);

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: csvResponseHeaders(`fidlify-clients-${date}.csv`),
  });
}

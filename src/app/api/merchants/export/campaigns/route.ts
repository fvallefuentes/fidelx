import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanLimits } from "@/lib/plan-limits";
import { csvResponseHeaders, toCsv, type CsvRow } from "@/lib/csv";

/**
 * GET /api/merchants/export/campaigns
 * Export CSV de toutes les campagnes du commerçant.
 * Réservé aux plans payants.
 */
export async function GET() {
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

  const campaigns = await prisma.notificationCampaign.findMany({
    where: { merchantId },
    include: {
      program: { select: { name: true } },
      _count: { select: { logs: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  type Row = CsvRow & {
    nom: string;
    statut: string;
    type_trigger: string;
    segment: string;
    message: string;
    programme: string;
    nb_envoyes: number;
    nb_logs: number;
    planifie_le: Date | null;
    envoye_le: Date | null;
    cree_le: Date;
  };

  const rows: Row[] = campaigns.map((c) => ({
    nom: c.name,
    statut: c.status,
    type_trigger: c.triggerType,
    segment: c.targetSegment,
    message: c.message,
    programme: c.program?.name ?? "",
    nb_envoyes: c.sentCount,
    nb_logs: c._count.logs,
    planifie_le: c.scheduledAt,
    envoye_le: c.sentAt,
    cree_le: c.createdAt,
  }));

  const csv = toCsv<Row>(rows, [
    { key: "nom", header: "Nom" },
    { key: "statut", header: "Statut" },
    { key: "type_trigger", header: "Type de déclencheur" },
    { key: "segment", header: "Segment cible" },
    { key: "message", header: "Message" },
    { key: "programme", header: "Programme" },
    { key: "nb_envoyes", header: "Envoyés" },
    { key: "nb_logs", header: "Logs (livraisons)" },
    { key: "planifie_le", header: "Planifié pour" },
    { key: "envoye_le", header: "Envoyé le" },
    { key: "cree_le", header: "Créé le" },
  ]);

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: csvResponseHeaders(`fidlify-campagnes-${date}.csv`),
  });
}

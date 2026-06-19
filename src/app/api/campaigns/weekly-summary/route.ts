import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildWeeklyCampaignSummary } from "@/lib/campaign-weekly-summary";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  return NextResponse.json(await buildWeeklyCampaignSummary(session.user.id));
}

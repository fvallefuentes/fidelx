import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildCampaignRecommendations } from "@/lib/campaign-recommendations";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const recommendations = await buildCampaignRecommendations(session.user.id);
  return NextResponse.json(recommendations);
}

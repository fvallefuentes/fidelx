import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listAdminAuditEntries } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/audit?action=...&targetType=...&adminId=...&cursor=...&limit=...
 * Liste paginée des actions admin (RGPD-friendly).
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || undefined;
  const targetType = url.searchParams.get("targetType") || undefined;
  const adminId = url.searchParams.get("adminId") || undefined;
  const cursor = url.searchParams.get("cursor") || undefined;
  const limit = Number(url.searchParams.get("limit") ?? "50");

  const entries = await listAdminAuditEntries({
    action,
    targetType,
    adminId,
    cursor,
    limit,
  });

  return NextResponse.json({
    entries,
    nextCursor: entries.length === limit ? entries[entries.length - 1].id : null,
  });
}

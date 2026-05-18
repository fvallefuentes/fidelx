import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listConfirmedSubscribers, newsletterStats } from "@/lib/newsletter";

export const dynamic = "force-dynamic";

async function ensureAdmin() {
  const session = await getServerSession(authOptions);
  return (session?.user as { role?: string })?.role === "ADMIN" ? session : null;
}

/**
 * GET /api/admin/newsletter
 * Renvoie les stats + liste des abonnés confirmés (max 1000).
 *
 * GET /api/admin/newsletter?format=csv
 * Export CSV (RFC 4180, séparateur ; pour Excel FR/CH).
 */
export async function GET(req: Request) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const format = url.searchParams.get("format");

  if (format === "csv") {
    const subs = await listConfirmedSubscribers(10_000);
    const lines = ["email;locale;source;confirmedAt;createdAt"];
    for (const s of subs) {
      const csv = [
        escapeCsv(s.email),
        escapeCsv(s.locale),
        escapeCsv(s.source ?? ""),
        escapeCsv(s.confirmedAt?.toISOString() ?? ""),
        escapeCsv(s.createdAt.toISOString()),
      ].join(";");
      lines.push(csv);
    }
    const body = "﻿" + lines.join("\r\n"); // BOM UTF-8 pour Excel
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="fidlify-newsletter-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  const [stats, subs] = await Promise.all([
    newsletterStats(),
    listConfirmedSubscribers(1000),
  ]);

  return NextResponse.json({
    stats,
    subscribers: subs.map((s) => ({
      id: s.id,
      email: s.email,
      locale: s.locale,
      source: s.source,
      confirmedAt: s.confirmedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
    })),
  });
}

function escapeCsv(v: string): string {
  if (v.includes(";") || v.includes("\"") || v.includes("\n") || v.includes("\r")) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}

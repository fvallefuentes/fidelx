"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, RotateCcw, Activity, Filter } from "lucide-react";

type Result =
  | "SUCCESS"
  | "RATE_LIMITED"
  | "DUPLICATE_RECOVERY"
  | "PROGRAM_FULL"
  | "PROGRAM_NOT_FOUND"
  | "VALIDATION_ERROR";

type Attempt = {
  id: string;
  programId: string;
  ipPrefix: string | null;
  userAgent: string | null;
  deviceCookie: string | null;
  fingerprint: string | null;
  email: string | null;
  phone: string | null;
  cardId: string | null;
  result: Result;
  blockedReason: string | null;
  createdAt: string;
  program: {
    id: string;
    name: string;
    merchant: { id: string; name: string | null; email: string };
  } | null;
};

type ApiResponse = {
  stats: {
    total24h: number;
    success24h: number;
    rateLimited24h: number;
    duplicate24h: number;
    total7d: number;
  };
  suspicious: {
    ips: { ipPrefix: string | null; count: number }[];
    cookies: { deviceCookie: string | null; count: number }[];
  };
  attempts: Attempt[];
};

const RESULT_LABELS: Record<Result, string> = {
  SUCCESS: "Succès",
  RATE_LIMITED: "Rate limited",
  DUPLICATE_RECOVERY: "Récupération",
  PROGRAM_FULL: "Plan plein",
  PROGRAM_NOT_FOUND: "Programme inconnu",
  VALIDATION_ERROR: "Validation échouée",
};

const RESULT_VARIANT: Record<
  Result,
  "default" | "secondary" | "success" | "destructive"
> = {
  SUCCESS: "success",
  RATE_LIMITED: "destructive",
  DUPLICATE_RECOVERY: "secondary",
  PROGRAM_FULL: "secondary",
  PROGRAM_NOT_FOUND: "secondary",
  VALIDATION_ERROR: "secondary",
};

type FilterMode = "all" | "suspicious" | "rate_limited" | "recovery";

export default function AbusePage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("all");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/abuse?filter=${filter}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-red-400">Erreur de chargement.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="h-6 w-6" /> Anti-abus
        </h1>
        <p className="text-gray-500">
          Tentatives d&apos;inscription via QR code · rate limiting et détection
        </p>
      </div>

      {/* Stats KPI */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard
          label="Tentatives 24h"
          value={data.stats.total24h}
          icon={Activity}
        />
        <KpiCard
          label="Succès 24h"
          value={data.stats.success24h}
          icon={Activity}
          color="#d4ff4e"
        />
        <KpiCard
          label="Rate limited 24h"
          value={data.stats.rateLimited24h}
          icon={AlertTriangle}
          color={data.stats.rateLimited24h > 0 ? "#ff7a6b" : undefined}
        />
        <KpiCard
          label="Récupérations 24h"
          value={data.stats.duplicate24h}
          icon={RotateCcw}
        />
        <KpiCard
          label="Tentatives 7j"
          value={data.stats.total7d}
          icon={Activity}
        />
      </div>

      {/* Top IPs / cookies suspects */}
      {(data.suspicious.ips.length > 0 ||
        data.suspicious.cookies.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {data.suspicious.ips.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-400" />
                  IP les plus actives (24h, &gt;3 tentatives)
                </CardTitle>
                <CardDescription>
                  IP anonymisée /24 (IPv4) ou /48 (IPv6)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {data.suspicious.ips.map((g, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center py-1.5 px-2 rounded bg-white/[0.02] text-xs"
                    >
                      <code className="font-mono text-gray-300">
                        {g.ipPrefix}
                      </code>
                      <Badge
                        variant={
                          g.count > 10
                            ? "destructive"
                            : g.count > 5
                            ? "default"
                            : "secondary"
                        }
                      >
                        {g.count} attempts
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {data.suspicious.cookies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-400" />
                  Devices les plus actifs (24h, &gt;3 tentatives)
                </CardTitle>
                <CardDescription>
                  Cookie fid_dev (UUID device)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {data.suspicious.cookies.map((g, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center py-1.5 px-2 rounded bg-white/[0.02] text-xs"
                    >
                      <code className="font-mono text-gray-300">
                        {g.deviceCookie?.slice(0, 8)}…
                      </code>
                      <Badge
                        variant={
                          g.count > 10
                            ? "destructive"
                            : g.count > 5
                            ? "default"
                            : "secondary"
                        }
                      >
                        {g.count} attempts
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Filtres */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-gray-400" />
        {(
          [
            { val: "all", label: "Toutes" },
            { val: "suspicious", label: "Suspectes" },
            { val: "rate_limited", label: "Rate limited" },
            { val: "recovery", label: "Récupérations" },
          ] as { val: FilterMode; label: string }[]
        ).map(({ val, label }) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className="text-xs px-2.5 py-1 rounded-full border transition-colors"
            style={
              filter === val
                ? {
                    background: "#d4ff4e",
                    color: "#0a0d04",
                    borderColor: "#d4ff4e",
                    fontWeight: 600,
                  }
                : {
                    borderColor: "rgba(255,255,255,0.15)",
                    color: "rgba(255,255,255,0.5)",
                  }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Liste des tentatives */}
      <Card>
        <CardHeader>
          <CardTitle>Tentatives récentes</CardTitle>
          <CardDescription>{data.attempts.length} entrées</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500 text-xs uppercase tracking-wider">
                  <th className="pb-2 px-2 font-medium">Date</th>
                  <th className="pb-2 px-2 font-medium">Résultat</th>
                  <th className="pb-2 px-2 font-medium">Programme</th>
                  <th className="pb-2 px-2 font-medium">IP / Cookie</th>
                  <th className="pb-2 px-2 font-medium">Email / Phone</th>
                  <th className="pb-2 px-2 font-medium">Raison</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.attempts.map((a) => (
                  <tr key={a.id} className="hover:bg-white/[0.02]">
                    <td className="py-2 px-2 text-xs text-gray-400 font-mono">
                      {new Date(a.createdAt).toLocaleString("fr-CH", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="py-2 px-2">
                      <Badge variant={RESULT_VARIANT[a.result]}>
                        {RESULT_LABELS[a.result]}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 text-xs">
                      {a.program ? (
                        <>
                          <div className="text-gray-200">
                            {a.program.name}
                          </div>
                          <div className="text-gray-500">
                            {a.program.merchant.name ||
                              a.program.merchant.email}
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-xs">
                      {a.ipPrefix && (
                        <div className="text-gray-300 font-mono">
                          {a.ipPrefix}
                        </div>
                      )}
                      {a.deviceCookie && (
                        <div
                          className="text-gray-500 font-mono"
                          title={a.deviceCookie}
                        >
                          {a.deviceCookie.slice(0, 8)}…
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-2 text-xs text-gray-300">
                      {a.email && <div>{a.email}</div>}
                      {a.phone && <div className="text-gray-500">{a.phone}</div>}
                    </td>
                    <td className="py-2 px-2 text-xs text-gray-500">
                      {a.blockedReason || "—"}
                    </td>
                  </tr>
                ))}
                {data.attempts.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-gray-500"
                    >
                      Aucune tentative correspondante.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}) {
  return (
    <div
      className="rounded-lg p-3 border"
      style={{
        background: "rgba(255,255,255,0.02)",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 uppercase tracking-wider">
          {label}
        </span>
        <span style={{ color: color || "rgba(255,255,255,0.4)" }}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div
        className="text-2xl font-bold mt-1"
        style={{ color: color || "#fff" }}
      >
        {value}
      </div>
    </div>
  );
}

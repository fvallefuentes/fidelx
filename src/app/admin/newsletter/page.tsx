"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle2, XCircle, Clock, Download, Loader2 } from "lucide-react";

type Stats = {
  total: number;
  confirmed: number;
  unsubscribed: number;
  pending: number;
};

type Subscriber = {
  id: string;
  email: string;
  locale: string;
  source: string | null;
  confirmedAt: string | null;
  createdAt: string;
};

export default function AdminNewsletterPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/newsletter")
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats ?? null);
        setSubs(data.subscribers ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="h-6 w-6" />
            Newsletter
          </h1>
          <p className="text-gray-500">
            Liste des abonnés à la newsletter Fidlify (double opt-in confirmé).
          </p>
        </div>
        <a
          href="/api/admin/newsletter?format=csv"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
          download
        >
          <Download className="h-4 w-4" />
          Export CSV
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
          label="Confirmés"
          value={stats?.confirmed ?? 0}
          highlight
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          label="En attente"
          value={stats?.pending ?? 0}
        />
        <StatCard
          icon={<XCircle className="h-5 w-5 text-red-500" />}
          label="Désabonnés"
          value={stats?.unsubscribed ?? 0}
        />
        <StatCard
          icon={<Mail className="h-5 w-5 text-blue-600" />}
          label="Total historique"
          value={stats?.total ?? 0}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Abonnés confirmés ({subs.length})</CardTitle>
          <CardDescription>
            Triés du plus récent au plus ancien. Limité à 1000 — utilisez l&apos;export CSV pour la liste complète.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subs.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Aucun abonné confirmé pour le moment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Langue</th>
                    <th className="px-3 py-2 font-medium">Source</th>
                    <th className="px-3 py-2 font-medium">Confirmé le</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subs.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs">{s.email}</td>
                      <td className="px-3 py-2 text-xs uppercase text-gray-500">{s.locale}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{s.source ?? "—"}</td>
                      <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                        {s.confirmedAt
                          ? new Date(s.confirmedAt).toLocaleString("fr-CH", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-green-300 bg-green-50" : undefined}>
      <CardContent className="py-4">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
          {icon}
          {label}
        </div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
      </CardContent>
    </Card>
  );
}

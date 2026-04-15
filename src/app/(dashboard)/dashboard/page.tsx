"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CreditCard, TrendingUp, Repeat } from "lucide-react";

interface DashboardStats {
  totalClients: number;
  activeCards: number;
  totalVisits: number;
  returnRate: number;
  recentClients: {
    id: string;
    firstName: string;
    email: string | null;
    currentStamps: number;
    lastVisitAt: string | null;
  }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/merchants/stats")
      .then((res) => res.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const statCards = [
    {
      title: "Clients inscrits",
      value: stats?.totalClients || 0,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Cartes actives",
      value: stats?.activeCards || 0,
      icon: CreditCard,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Visites totales",
      value: stats?.totalVisits || 0,
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Taux de retour",
      value: `${stats?.returnRate || 0}%`,
      icon: Repeat,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500">Vue d&apos;ensemble de votre programme de fidélité</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`rounded-lg p-3 ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Clients */}
      <Card>
        <CardHeader>
          <CardTitle>Derniers clients</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recentClients && stats.recentClients.length > 0 ? (
            <div className="space-y-3">
              {stats.recentClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{client.firstName}</p>
                    <p className="text-sm text-gray-500">
                      {client.email || "Pas d'email"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="default">
                      {client.currentStamps} tampons
                    </Badge>
                    {client.lastVisitAt && (
                      <span className="text-xs text-gray-400">
                        {new Date(client.lastVisitAt).toLocaleDateString("fr-CH")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Aucun client pour le moment. Partagez votre QR code pour commencer !
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

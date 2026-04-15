"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search } from "lucide-react";

interface ClientCard {
  id: string;
  serialNumber: string;
  currentStamps: number;
  currentPoints: number;
  totalVisits: number;
  status: string;
  lastVisitAt: string | null;
  createdAt: string;
  client: {
    id: string;
    firstName: string;
    email: string | null;
    phone: string | null;
  };
  program: {
    name: string;
    type: string;
    config: Record<string, unknown>;
  };
}

export default function ClientsPage() {
  const [cards, setCards] = useState<ClientCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/cards")
      .then((res) => res.json())
      .then(setCards)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = cards.filter(
    (c) =>
      c.client.firstName.toLowerCase().includes(search.toLowerCase()) ||
      c.client.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.serialNumber.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <p className="text-gray-500">
          {cards.length} client{cards.length !== 1 ? "s" : ""} inscrits
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Rechercher par nom, email ou numéro de carte..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">
              {search ? "Aucun résultat" : "Aucun client"}
            </h3>
            <p className="text-gray-500 mt-1">
              {search
                ? "Essayez un autre terme de recherche"
                : "Partagez votre QR code pour commencer à inscrire des clients"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Liste des clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 font-medium">Client</th>
                    <th className="pb-3 font-medium">Programme</th>
                    <th className="pb-3 font-medium">Progression</th>
                    <th className="pb-3 font-medium">Visites</th>
                    <th className="pb-3 font-medium">Dernière visite</th>
                    <th className="pb-3 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((card) => (
                    <tr key={card.id} className="hover:bg-gray-50">
                      <td className="py-3">
                        <div>
                          <p className="font-medium">{card.client.firstName}</p>
                          <p className="text-xs text-gray-400">
                            {card.client.email || card.client.phone || "—"}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 text-gray-600">{card.program.name}</td>
                      <td className="py-3">
                        {card.program.type === "STAMPS" ? (
                          <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                              {Array.from({
                                length: (card.program.config as { maxStamps?: number }).maxStamps || 10,
                              }).map((_, i) => (
                                <div
                                  key={i}
                                  className={`h-3 w-3 rounded-full ${
                                    i < card.currentStamps
                                      ? "bg-blue-600"
                                      : "bg-gray-200"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-gray-500">
                              {card.currentStamps}/
                              {(card.program.config as { maxStamps?: number }).maxStamps || 10}
                            </span>
                          </div>
                        ) : (
                          <span>{card.currentPoints} pts</span>
                        )}
                      </td>
                      <td className="py-3 text-gray-600">{card.totalVisits}</td>
                      <td className="py-3 text-gray-500">
                        {card.lastVisitAt
                          ? new Date(card.lastVisitAt).toLocaleDateString("fr-CH")
                          : "—"}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={
                            card.status === "ACTIVE"
                              ? "success"
                              : card.status === "COMPLETED"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {card.status === "ACTIVE"
                            ? "Actif"
                            : card.status === "COMPLETED"
                              ? "Complété"
                              : card.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

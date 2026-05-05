"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search, Smartphone, XCircle, Hourglass, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface ClientCard {
  id: string;
  serialNumber: string;
  currentStamps: number;
  currentPoints: number;
  totalVisits: number;
  status: string;
  lastVisitAt: string | null;
  createdAt: string;
  walletStatus: "installed" | "removed" | "never_installed";
  walletDevices: { apple: number; google: number; total: number };
  client: { id: string; firstName: string; email: string | null; phone: string | null };
  program: { name: string; type: string; config: Record<string, unknown> };
}

type SortKey = "firstName" | "progression" | "totalVisits" | "lastVisitAt" | "walletStatus" | "status";
type SortDir = "asc" | "desc";

const WALLET_ORDER = { installed: 0, removed: 1, never_installed: 2 };
const STATUS_ORDER: Record<string, number> = { ACTIVE: 0, REWARD_PENDING: 1, COMPLETED: 2, EXPIRED: 3, REVOKED: 4 };
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Actif", COMPLETED: "Complété", REWARD_PENDING: "Récompense", EXPIRED: "Expiré", REVOKED: "Révoqué",
};

function getProgression(card: ClientCard): number {
  if (card.program.type === "STAMPS") {
    const max = (card.program.config as { maxStamps?: number }).maxStamps || 10;
    return card.currentStamps / max;
  }
  return card.currentPoints;
}

export default function ClientsPage() {
  const [cards, setCards] = useState<ClientCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("lastVisitAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    fetch("/api/cards")
      .then((r) => r.json())
      .then(setCards)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const filtered = cards
    .filter((c) =>
      c.client.firstName.toLowerCase().includes(search.toLowerCase()) ||
      c.client.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.serialNumber.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "firstName":
          cmp = a.client.firstName.localeCompare(b.client.firstName);
          break;
        case "progression":
          cmp = getProgression(a) - getProgression(b);
          break;
        case "totalVisits":
          cmp = a.totalVisits - b.totalVisits;
          break;
        case "lastVisitAt":
          cmp = (a.lastVisitAt ? new Date(a.lastVisitAt).getTime() : 0) -
                (b.lastVisitAt ? new Date(b.lastVisitAt).getTime() : 0);
          break;
        case "walletStatus":
          cmp = WALLET_ORDER[a.walletStatus] - WALLET_ORDER[b.walletStatus];
          break;
        case "status":
          cmp = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

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
        <p className="text-gray-500">{cards.length} client{cards.length !== 1 ? "s" : ""} inscrits</p>
      </div>

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
              {search ? "Essayez un autre terme de recherche" : "Partagez votre QR code pour commencer à inscrire des clients"}
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
                    <SortTh label="Client"         col="firstName"  active={sortKey} dir={sortDir} onSort={handleSort} />
                    <th className="pb-3 font-medium px-2">Programme</th>
                    <SortTh label="Progression"    col="progression" active={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortTh label="Visites"         col="totalVisits" active={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortTh label="Dernière visite" col="lastVisitAt" active={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortTh label="Wallet"          col="walletStatus" active={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortTh label="Statut"          col="status"      active={sortKey} dir={sortDir} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((card) => {
                    const maxStamps = (card.program.config as { maxStamps?: number }).maxStamps || 10;
                    return (
                      <tr key={card.id} className="hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <p className="font-medium">{card.client.firstName}</p>
                          <p className="text-xs text-gray-400">{card.client.email || card.client.phone || "—"}</p>
                        </td>
                        <td className="py-3 px-2 text-gray-600">{card.program.name}</td>
                        <td className="py-3 px-2">
                          {card.program.type === "STAMPS" ? (
                            <div className="flex items-center gap-2">
                              <div className="flex gap-0.5">
                                {Array.from({ length: maxStamps }).map((_, i) => (
                                  <div key={i} className={`h-3 w-3 rounded-full ${i < card.currentStamps ? "bg-blue-600" : "bg-gray-200"}`} />
                                ))}
                              </div>
                              <span className="text-xs text-gray-500">{card.currentStamps}/{maxStamps}</span>
                            </div>
                          ) : (
                            <span>{card.currentPoints} pts</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-gray-600">{card.totalVisits}</td>
                        <td className="py-3 px-2 text-gray-500">
                          {card.lastVisitAt ? new Date(card.lastVisitAt).toLocaleDateString("fr-CH") : "—"}
                        </td>
                        <td className="py-3 px-2">
                          {card.walletStatus === "installed" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: "#d4ff4e" }}>
                              <Smartphone className="h-3.5 w-3.5" /> Dans le Wallet
                            </span>
                          ) : card.walletStatus === "removed" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400">
                              <XCircle className="h-3.5 w-3.5" /> Supprimée
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                              <Hourglass className="h-3.5 w-3.5" /> Pas installée
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant={card.status === "ACTIVE" ? "success" : card.status === "COMPLETED" ? "default" : "secondary"}>
                            {STATUS_LABELS[card.status] ?? card.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ── Colonne triable ─────────────────────────────────────── */
function SortTh({ label, col, active, dir, onSort }: {
  label: string; col: SortKey; active: SortKey; dir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const isActive = active === col;
  const Icon = isActive ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th className="pb-3 px-2">
      <button
        onClick={() => onSort(col)}
        className="inline-flex items-center gap-1 font-medium hover:text-gray-900 transition-colors"
        style={{ color: isActive ? "#d4ff4e" : undefined }}
      >
        {label}
        <Icon className="h-3.5 w-3.5 opacity-60" />
      </button>
    </th>
  );
}

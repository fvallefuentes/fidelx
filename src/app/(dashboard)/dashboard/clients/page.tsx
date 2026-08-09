"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Users,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  UserPlus,
  X,
  ListPlus,
  Trash2,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import CardRecoveryModal from "@/components/dashboard/CardRecoveryModal";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";

interface ClientCard {
  id: string;
  serialNumber: string;
  currentStamps: number;
  currentPoints: number;
  totalVisits: number;
  status: string;
  lastVisitAt: string | null;
  createdAt: string;
  walletStatus: "installed" | "manual" | "removed" | "never_installed";
  walletDevices: { apple: number; google: number; total: number };
  client: { id: string; firstName: string; lastName?: string | null; email: string | null; phone: string | null };
  program: { name: string; type: string; config: Record<string, unknown> };
}

interface ClientList {
  id: string;
  name: string;
  members: Array<{
    clientId: string;
    client: {
      firstName: string;
      lastName: string | null;
      email: string | null;
      phone: string | null;
    };
  }>;
  _count: { members: number };
}

type SortKey = "firstName" | "progression" | "totalVisits" | "lastVisitAt" | "walletStatus" | "status";
type SortDir = "asc" | "desc";

const WALLET_ORDER = { installed: 0, manual: 1, removed: 2, never_installed: 3 };
const STATUS_ORDER: Record<string, number> = { PENDING: 0, ACTIVE: 1, REWARD_PENDING: 2, COMPLETED: 3, EXPIRED: 4, REVOKED: 5 };
const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente", ACTIVE: "Actif", COMPLETED: "Complété", REWARD_PENDING: "Récompense", EXPIRED: "Expiré", REVOKED: "Révoqué",
};

function getProgression(card: ClientCard): number {
  if (card.program.type === "STAMPS") {
    const max = (card.program.config as { maxStamps?: number }).maxStamps || 10;
    return card.currentStamps / max;
  }
  return card.currentPoints;
}

type WalletFilter = "all" | "installed" | "manual" | "removed" | "never_installed";
type StatusFilter = "all" | "PENDING" | "ACTIVE" | "COMPLETED" | "REWARD_PENDING" | "EXPIRED" | "REVOKED";

export default function ClientsPage() {
  const router = useRouter();
  const [cards, setCards] = useState<ClientCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("lastVisitAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [walletFilter, setWalletFilter] = useState<WalletFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [recoveryCard, setRecoveryCard] = useState<ClientCard | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showListsModal, setShowListsModal] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());

  // Refresh sans toucher au loading (utilisé après création manuelle d'une
  // carte — pas besoin de re-bloquer toute la page sur un spinner).
  function refreshCards() {
    fetch("/api/cards")
      .then((r) => r.json())
      .then(setCards)
      .catch(console.error);
  }

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
    .filter((c) => {
      const q = search.toLowerCase();
      const matchesSearch =
        c.client.firstName.toLowerCase().includes(q) ||
        c.client.lastName?.toLowerCase().includes(q) ||
        c.client.email?.toLowerCase().includes(q) ||
        c.serialNumber.toLowerCase().includes(q);
      return (
        matchesSearch &&
        (walletFilter === "all" || c.walletStatus === walletFilter) &&
        (statusFilter === "all" || c.status === statusFilter)
      );
    })
    .sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "firstName": {
          const fa = `${a.client.firstName} ${a.client.lastName ?? ""}`.trim();
          const fb = `${b.client.firstName} ${b.client.lastName ?? ""}`.trim();
          cmp = fa.localeCompare(fb);
          break;
        }
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

  const filteredClientIds = [...new Set(filtered.map((card) => card.client.id))];
  const allFilteredSelected =
    filteredClientIds.length > 0 &&
    filteredClientIds.every((clientId) => selectedClientIds.has(clientId));

  function toggleClient(clientId: string) {
    setSelectedClientIds((current) => {
      const next = new Set(current);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  }

  function toggleFilteredClients() {
    setSelectedClientIds((current) => {
      const next = new Set(current);
      if (allFilteredSelected) {
        filteredClientIds.forEach((clientId) => next.delete(clientId));
      } else {
        filteredClientIds.forEach((clientId) => next.add(clientId));
      }
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500">
            {cards.length} client{cards.length !== 1 ? "s" : ""} inscrits
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowListsModal(true)}
            className="gap-2"
          >
            <ListPlus className="h-4 w-4" />
            Listes clients
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Créer une carte (sans smartphone)
          </Button>
          <ExportCsvButton
            endpoint="/api/merchants/export/clients"
            filename="fidlify-clients.csv"
            label="Exporter clients"
          />
          <ExportCsvButton
            endpoint="/api/merchants/export/transactions"
            filename="fidlify-transactions.csv"
            label="Exporter transactions"
          />
        </div>
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

      {/* Filtres */}
      <div className="flex flex-wrap gap-4">
        {/* Wallet */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-gray-400 mr-1">Wallet :</span>
          {([
            { val: "all",             label: "Tous" },
            { val: "installed",       label: "Dans le Wallet" },
            { val: "manual",          label: "Sans smartphone" },
            { val: "removed",         label: "Supprimée" },
            { val: "never_installed", label: "Pas installée" },
          ] as { val: WalletFilter; label: string }[]).map(({ val, label }) => (
            <button
              key={val}
              onClick={() => setWalletFilter(val)}
              className="text-xs px-2.5 py-1 rounded-full border transition-colors"
              style={walletFilter === val
                ? { background: "#d4ff4e", color: "#0a0d04", borderColor: "#d4ff4e", fontWeight: 600 }
                : { borderColor: "rgb(var(--ovr) / 0.15)", color: "rgb(var(--ovr) / 0.5)" }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* Statut carte */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-gray-400 mr-1">Statut :</span>
          {([
            { val: "all",            label: "Tous" },
            { val: "PENDING",        label: "En attente" },
            { val: "ACTIVE",         label: "Actif" },
            { val: "COMPLETED",      label: "Complété" },
            { val: "REWARD_PENDING", label: "Récompense" },
            { val: "EXPIRED",        label: "Expiré" },
            { val: "REVOKED",        label: "Révoqué" },
          ] as { val: StatusFilter; label: string }[]).map(({ val, label }) => (
            <button
              key={val}
              onClick={() => setStatusFilter(val)}
              className="text-xs px-2.5 py-1 rounded-full border transition-colors"
              style={statusFilter === val
                ? { background: "#d4ff4e", color: "#0a0d04", borderColor: "#d4ff4e", fontWeight: 600 }
                : { borderColor: "rgb(var(--ovr) / 0.15)", color: "rgb(var(--ovr) / 0.5)" }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {selectedClientIds.size > 0 && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3"
          style={{
            borderColor: "rgba(132, 180, 18, 0.35)",
            background: "rgba(212, 255, 78, 0.12)",
          }}
        >
          <div>
            <strong>
              {selectedClientIds.size} client{selectedClientIds.size > 1 ? "s" : ""} sélectionné{selectedClientIds.size > 1 ? "s" : ""}
            </strong>
            <p className="text-xs text-gray-500">Ajoutez cette sélection à une liste réutilisable.</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setSelectedClientIds(new Set())}>
              Effacer
            </Button>
            <Button type="button" className="gap-2" onClick={() => setShowListsModal(true)}>
              <ListPlus className="h-4 w-4" />
              Ajouter à une liste
            </Button>
          </div>
        </div>
      )}

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
            <CardTitle className="flex items-center justify-between">
              <span>Liste des clients</span>
              <span className="text-sm font-normal text-gray-400">
                {filtered.length} / {cards.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 pr-2 font-medium" style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        aria-label="Sélectionner les clients affichés"
                        checked={allFilteredSelected}
                        onChange={toggleFilteredClients}
                      />
                    </th>
                    <SortTh label="Client"         col="firstName"  active={sortKey} dir={sortDir} onSort={handleSort} />
                    <th className="pb-3 font-medium px-2">Programme</th>
                    <SortTh label="Progression"    col="progression" active={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortTh label="Visites"         col="totalVisits" active={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortTh label="Dernière visite" col="lastVisitAt" active={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortTh label="Wallet"          col="walletStatus" active={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortTh label="Statut"          col="status"      active={sortKey} dir={sortDir} onSort={handleSort} />
                    <th className="pb-3 font-medium px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((card) => {
                    const maxStamps = (card.program.config as { maxStamps?: number }).maxStamps || 10;
                    return (
                      <tr
                        key={card.id}
                        className="client-table-row cursor-pointer transition-colors"
                        onClick={() => router.push(`/dashboard/clients/${card.id}`)}
                      >
                        <td className="py-3 pr-2" onClick={(event) => event.stopPropagation()}>
                          <input
                            type="checkbox"
                            aria-label={`Sélectionner ${card.client.firstName}`}
                            checked={selectedClientIds.has(card.client.id)}
                            onChange={() => toggleClient(card.client.id)}
                          />
                        </td>
                        <td className="py-3 px-2">
                          <p className="font-medium">
                            {card.client.firstName}
                            {card.client.lastName ? ` ${card.client.lastName}` : ""}
                          </p>
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
                          <WalletStatusCell
                            status={card.walletStatus}
                            devices={card.walletDevices}
                          />
                        </td>
                        <td className="py-3 px-2">
                          <CardStatusBadge status={card.status} />
                        </td>
                        <td className="py-3 px-2 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRecoveryCard(card);
                            }}
                            className="client-row-action"
                            title="Récupérer la carte (QR à donner au client)"
                          >
                            <RotateCcw size={12} />
                            Récup.
                          </button>
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

      {recoveryCard && (
        <CardRecoveryModal
          open={!!recoveryCard}
          onClose={() => setRecoveryCard(null)}
          clientFirstName={recoveryCard.client.firstName}
          programName={recoveryCard.program.name}
          serialNumber={recoveryCard.serialNumber}
        />
      )}

      {showCreateModal && (
        <CreateManualCardModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            refreshCards();
          }}
        />
      )}

      {showListsModal && (
        <ClientListsModal
          selectedClientIds={[...selectedClientIds]}
          onClose={() => setShowListsModal(false)}
          onSelectionAdded={() => setSelectedClientIds(new Set())}
        />
      )}
    </div>
  );
}

function ClientListsModal({
  selectedClientIds,
  onClose,
  onSelectionAdded,
}: {
  selectedClientIds: string[];
  onClose: () => void;
  onSelectionAdded: () => void;
}) {
  const [lists, setLists] = useState<ClientList[]>([]);
  const [expandedListId, setExpandedListId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadLists() {
    setLoading(true);
    try {
      const response = await fetch("/api/merchants/client-lists");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible de charger les listes.");
      setLists(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger les listes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLists();
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  async function createList() {
    if (!newListName.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/merchants/client-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newListName.trim(), clientIds: selectedClientIds }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible de créer la liste.");
      setNewListName("");
      if (selectedClientIds.length > 0) onSelectionAdded();
      await loadLists();
      setExpandedListId(data.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Impossible de créer la liste.");
    } finally {
      setSaving(false);
    }
  }

  async function updateMembers(
    listId: string,
    input: { addClientIds?: string[]; removeClientIds?: string[] }
  ) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/merchants/client-lists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: listId, ...input }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible de modifier la liste.");
      if (input.addClientIds?.length) onSelectionAdded();
      await loadLists();
      setExpandedListId(listId);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Impossible de modifier la liste.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteList(listId: string, name: string) {
    if (!window.confirm(`Supprimer la liste « ${name} » ? Les clients ne seront pas supprimés.`)) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/merchants/client-lists?id=${encodeURIComponent(listId)}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible de supprimer la liste.");
      if (expandedListId === listId) setExpandedListId(null);
      await loadLists();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Impossible de supprimer la liste.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-lists-title"
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border p-5 shadow-xl"
        style={{ background: "var(--bg)", borderColor: "rgb(var(--ovr) / 0.16)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="client-lists-title" className="text-lg font-semibold text-gray-900">Listes clients</h2>
            <p className="text-sm text-gray-500">Créez des groupes réutilisables dans vos campagnes.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <div className="mt-5 flex gap-2">
          <Input
            value={newListName}
            onChange={(event) => setNewListName(event.target.value)}
            placeholder="Ex : Abonnements à renouveler"
            maxLength={80}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void createList();
              }
            }}
          />
          <Button type="button" onClick={() => void createList()} disabled={saving || !newListName.trim()} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            Créer
          </Button>
        </div>
        {selectedClientIds.length > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            La nouvelle liste contiendra les {selectedClientIds.length} clients actuellement sélectionnés.
          </p>
        )}

        <div className="mt-5 space-y-2">
          {loading ? (
            <p className="py-6 text-center text-sm text-gray-500">Chargement des listes...</p>
          ) : lists.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
              Aucune liste enregistrée.
            </div>
          ) : (
            lists.map((list) => {
              const expanded = expandedListId === list.id;
              return (
                <div key={list.id} className="rounded-lg border" style={{ borderColor: "rgb(var(--ovr) / 0.13)" }}>
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setExpandedListId(expanded ? null : list.id)}
                    >
                      <strong className="block truncate text-sm text-gray-900">{list.name}</strong>
                      <span className="text-xs text-gray-500">{list._count.members} client{list._count.members !== 1 ? "s" : ""}</span>
                    </button>
                    <div className="flex gap-2">
                      {selectedClientIds.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={saving}
                          onClick={() => void updateMembers(list.id, { addClientIds: selectedClientIds })}
                        >
                          Ajouter la sélection
                        </Button>
                      )}
                      <button
                        type="button"
                        title="Supprimer la liste"
                        aria-label={`Supprimer ${list.name}`}
                        className="rounded-md border p-2 text-red-500"
                        onClick={() => void deleteList(list.id, list.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {expanded && (
                    <div className="border-t px-3 py-2" style={{ borderColor: "rgb(var(--ovr) / 0.1)" }}>
                      {list.members.length === 0 ? (
                        <p className="py-2 text-xs text-gray-500">Cette liste est vide.</p>
                      ) : (
                        <div className="divide-y">
                          {list.members.map((member) => (
                            <div key={member.clientId} className="flex items-center justify-between gap-3 py-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm text-gray-900">
                                  {member.client.firstName}{member.client.lastName ? ` ${member.client.lastName}` : ""}
                                </p>
                                <p className="truncate text-xs text-gray-500">{member.client.email || member.client.phone || "Sans coordonnées"}</p>
                              </div>
                              <button
                                type="button"
                                className="text-xs font-medium text-red-500"
                                disabled={saving}
                                onClick={() => void updateMembers(list.id, { removeClientIds: [member.clientId] })}
                              >
                                Retirer
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Modal de création manuelle de carte (client sans smartphone) ─── */
function CreateManualCardModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  type Program = { id: string; name: string; isActive: boolean };
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programId, setProgramId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/programs")
      .then((r) => r.json())
      .then((data: Program[]) => {
        const active = data.filter((p) => p.isActive !== false);
        setPrograms(active);
        if (active.length === 1) setProgramId(active[0].id);
      })
      .catch(console.error);
  }, []);

  // Verrouille le scroll body + escape pour fermer
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!programId) {
      setError("Choisis un programme.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/merchants/cards/create-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          birthDate: birthDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de la création");
        setSaving(false);
        return;
      }
      onCreated();
    } catch {
      setError("Erreur réseau");
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(7,7,7,0.8)",
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="manual-card-modal"
        style={{
          background: "#0c0d0c",
          border: "1px solid rgb(var(--ovr) / 0.12)",
          borderRadius: 14,
          padding: 24,
          maxWidth: 480,
          width: "100%",
          color: "#f4f5f1",
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
              <UserPlus
                size={16}
                style={{ display: "inline", marginRight: 8, verticalAlign: -3 }}
              />
              Créer une carte manuelle
            </h2>
            <p
              className="mt-1"
              style={{ fontSize: 12, color: "#8a8e84", margin: 0 }}
            >
              Pour un client sans smartphone — c&apos;est toi qui gères la carte
              ensuite.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: "none",
              border: 0,
              color: "#8a8e84",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 mt-4">
          {error && (
            <div
              className="rounded-lg px-3 py-2 text-sm"
              style={{
                background: "rgba(255,80,80,0.1)",
                border: "1px solid rgba(255,80,80,0.3)",
                color: "#ff7a6b",
              }}
            >
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label
              className="text-xs"
              style={{ color: "#c4c8be" }}
            >
              Programme {programs.length > 1 && "*"}
            </label>
            <select
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              required
              style={{
                width: "100%",
                height: 38,
                padding: "0 10px",
                background: "rgb(var(--ovr) / 0.04)",
                border: "1px solid rgb(var(--ovr) / 0.12)",
                color: "#f4f5f1",
                borderRadius: 8,
                fontFamily: "inherit",
              }}
            >
              <option value="">— Choisis un programme —</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs" style={{ color: "#c4c8be" }}>
                Prénom *
              </label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Marie"
                required
                maxLength={50}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs" style={{ color: "#c4c8be" }}>
                Nom *
              </label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Dupont"
                required
                maxLength={50}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs" style={{ color: "#c4c8be" }}>
              Email (optionnel)
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="marie@example.ch"
              maxLength={200}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs" style={{ color: "#c4c8be" }}>
              Téléphone (optionnel)
            </label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+41 79 ..."
              maxLength={40}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs" style={{ color: "#c4c8be" }}>
              Date de naissance (optionnel)
            </label>
            <Input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Création..." : "Créer la carte"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Cellule Wallet : statut + nb d'appareils + breakdown plateforme ─ */
function WalletStatusCell({
  status,
  devices,
}: {
  status: "installed" | "manual" | "removed" | "never_installed";
  devices: { apple: number; google: number; total: number };
}) {
  if (status === "manual") {
    return (
      <span className="wallet-status-manual inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold">
        <span className="h-1.5 w-1.5 rounded-full" /> Sans smartphone
      </span>
    );
  }
  if (status === "removed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Supprimée
      </span>
    );
  }
  if (status === "never_installed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-500">
        <span className="h-1.5 w-1.5 rounded-full bg-stone-400" /> Pas installée
      </span>
    );
  }
  // installed → afficher détail des appareils
  const breakdown = [
    devices.apple ? `${devices.apple} iOS` : "",
    devices.google ? `${devices.google} Android` : "",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      className="inline-flex items-center gap-2"
      title={`Carte installée sur ${breakdown}`}
    >
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
        style={{ background: "rgb(var(--accent-rgb) / 0.20)", color: "var(--accent-ink)" }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent-ink)" }} />
        {devices.total > 1 ? `Dans le Wallet · ${devices.total}` : "Dans le Wallet"}
      </span>
      {(devices.apple > 0 || devices.google > 0) && (
        <span className="inline-flex items-center gap-1">
          {devices.apple > 0 && (
            <span
              className="inline-flex items-center justify-center rounded-full"
              style={{
                width: 18,
                height: 18,
                background: "rgb(var(--ovr) / 0.06)",
                border: "1px solid rgb(var(--ovr) / 0.12)",
                color: "#c9ccc3",
              }}
              title={`Apple Wallet (${devices.apple})`}
            >
              <svg width="9" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.39c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.39-1.32 2.76-2.53 4zm-3.1-17.24c-2.22.22-4.03 2.46-3.79 4.5 2.04.16 4.09-2.16 3.79-4.5z" />
              </svg>
            </span>
          )}
          {devices.google > 0 && (
            <span
              className="inline-flex items-center justify-center rounded-full"
              style={{
                width: 18,
                height: 18,
                background: "rgb(var(--ovr) / 0.06)",
                border: "1px solid rgb(var(--ovr) / 0.12)",
                fontSize: 9,
                color: "#c9ccc3",
              }}
              title="Google Wallet"
            >
              G
            </span>
          )}
        </span>
      )}
    </div>
  );
}

function CardStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { background: string; color: string; dot: string }> = {
    ACTIVE: { background: "rgb(var(--accent-rgb) / 0.20)", color: "var(--accent-ink)", dot: "var(--accent-ink)" },
    PENDING: { background: "#fff2d6", color: "#a16207", dot: "#d97706" },
    COMPLETED: { background: "#dcf3e5", color: "#21844b", dot: "#289055" },
    REWARD_PENDING: { background: "#eee6ff", color: "#7853c7", dot: "#8b5cf6" },
    EXPIRED: { background: "#efefeb", color: "#797a72", dot: "#989891" },
    REVOKED: { background: "#fee9eb", color: "#db3a42", dot: "#ef4444" },
  };
  const style = styles[status] ?? styles.PENDING;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: style.background, color: style.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: style.dot }} />
      {STATUS_LABELS[status] ?? status}
    </span>
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

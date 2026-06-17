"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  Cake,
  Calendar,
  TrendingUp,
  Clock,
  CreditCard,
  Send,
  StickyNote,
  Save,
  Smartphone,
  Gift,
  Stamp,
  Megaphone,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type DetailResponse = {
  card: {
    id: string;
    serialNumber: string;
    status: string;
    currentStamps: number;
    currentPoints: number;
    cashbackBalance: number;
    totalVisits: number;
    totalSpent: number;
    lastVisitAt: string | null;
    lastMessage: string | null;
    lastMessageAt: string | null;
    merchantNotes: string | null;
    createdAt: string;
  };
  client: {
    id: string;
    firstName: string;
    email: string | null;
    phone: string | null;
    birthDate: string | null;
    preferredLang: string;
    createdAt: string;
  };
  program: {
    id: string;
    name: string;
    type: string;
    config: Record<string, unknown>;
  };
  rfm: {
    recencyDays: number | null;
    frequencyPerMonth: number;
    avgPerVisit: number;
    visitCount: number;
  };
  wallet: {
    devices: number;
    apple: number;
    google: number;
    registrations: { platform: string; registeredAt: string }[];
  };
  transactions: {
    id: string;
    type: string;
    value: number;
    amountSpent: number | null;
    notes: string | null;
    establishment: string | null;
    createdAt: string;
  }[];
  rewards: {
    id: string;
    name: string;
    status: string;
    claimedAt: string;
    redeemedAt: string | null;
  }[];
  campaigns: {
    id: string;
    delivered: boolean;
    deliveredAt: string | null;
    createdAt: string;
    campaign: { name: string; message: string } | null;
  }[];
};

const TX_LABELS: Record<string, string> = {
  STAMP: "Tampon",
  POINTS_EARN: "Points gagnés",
  POINTS_SPEND: "Points dépensés",
  REWARD_CLAIM: "Récompense remise",
  CASHBACK_EARN: "Cashback",
  CASHBACK_SPEND: "Cashback utilisé",
  REFERRAL_BONUS: "Parrainage",
  GOOGLE_REVIEW_BONUS: "Avis Google",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  ACTIVE: "Actif",
  COMPLETED: "Complété",
  REWARD_PENDING: "Récompense",
  EXPIRED: "Expiré",
  REVOKED: "Révoqué",
};

export default function ClientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const cardId = params.id as string;
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [pushOpen, setPushOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/merchants/cards/${cardId}`);
      if (res.status === 404 || res.status === 403) {
        setNotFound(true);
        return;
      }
      const d: DetailResponse = await res.json();
      setData(d);
      setNotes(d.card.merchantNotes ?? "");
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveNotes() {
    setSavingNotes(true);
    setNotesSaved(false);
    try {
      const res = await fetch(`/api/merchants/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantNotes: notes }),
      });
      if (res.ok) {
        setNotesSaved(true);
        setTimeout(() => setNotesSaved(false), 2000);
      }
    } finally {
      setSavingNotes(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <h2 className="text-lg font-bold mb-2">Client introuvable</h2>
        <p className="text-gray-500 mb-4">
          Cette carte n&apos;existe pas ou ne vous appartient pas.
        </p>
        <Link
          href="/dashboard/clients"
          className="text-blue-600 hover:underline"
        >
          ← Retour à la liste
        </Link>
      </div>
    );
  }

  const config = data.program.config as { maxStamps?: number };
  const maxStamps = config.maxStamps || 10;
  const isStamps = data.program.type === "STAMPS";

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => router.push("/dashboard/clients")}
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200 mb-2"
        >
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {data.client.firstName}
            </h1>
            <p className="text-gray-500 text-sm">
              {data.program.name} · Inscrit le{" "}
              {new Date(data.client.createdAt).toLocaleDateString("fr-CH")}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Badge
              variant={
                data.card.status === "ACTIVE"
                  ? "success"
                  : data.card.status === "PENDING"
                  ? "secondary"
                  : "default"
              }
            >
              {STATUS_LABELS[data.card.status] || data.card.status}
            </Badge>
            <Button
              size="sm"
              onClick={() => setPushOpen(true)}
              disabled={
                data.card.status === "REVOKED" ||
                data.card.status === "EXPIRED"
              }
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Envoyer une notification
            </Button>
          </div>
        </div>
      </div>

      {/* Identité */}
      <Card>
        <CardContent className="pt-4 grid sm:grid-cols-3 gap-4 text-sm">
          <InfoLine
            icon={<Mail size={14} />}
            label="Email"
            value={data.client.email || "—"}
          />
          <InfoLine
            icon={<Phone size={14} />}
            label="Téléphone"
            value={data.client.phone || "—"}
          />
          <InfoLine
            icon={<Cake size={14} />}
            label="Anniversaire"
            value={
              data.client.birthDate
                ? new Date(data.client.birthDate).toLocaleDateString("fr-CH", {
                    day: "numeric",
                    month: "long",
                  })
                : "—"
            }
          />
          <InfoLine
            icon={<Smartphone size={14} />}
            label="Wallet"
            value={
              data.wallet.devices > 0
                ? `${data.wallet.devices} appareil${data.wallet.devices > 1 ? "s" : ""}`
                : "Non installé"
            }
          />
          <InfoLine
            icon={<CreditCard size={14} />}
            label="N° carte"
            value={
              <code className="text-xs font-mono">
                {data.card.serialNumber}
              </code>
            }
          />
          <InfoLine
            icon={<Calendar size={14} />}
            label="Inscrit"
            value={new Date(data.card.createdAt).toLocaleDateString("fr-CH")}
          />
        </CardContent>
      </Card>

      {/* Stats RFM + progression */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Récence"
          value={
            data.rfm.recencyDays === null
              ? "—"
              : data.rfm.recencyDays === 0
              ? "Aujourd'hui"
              : `${data.rfm.recencyDays}j`
          }
          sub={data.rfm.recencyDays !== null ? "depuis dernière visite" : ""}
          icon={<Clock size={14} />}
        />
        <KpiCard
          label="Fréquence"
          value={`${data.rfm.frequencyPerMonth}`}
          sub="visites / mois"
          icon={<TrendingUp size={14} />}
        />
        <KpiCard
          label="Panier moyen"
          value={
            data.rfm.avgPerVisit > 0
              ? `${data.rfm.avgPerVisit.toFixed(2)} CHF`
              : "—"
          }
          sub="par visite"
          icon={<CreditCard size={14} />}
        />
        <KpiCard
          label="Total dépensé"
          value={
            data.card.totalSpent > 0
              ? `${data.card.totalSpent.toFixed(0)} CHF`
              : "—"
          }
          sub={`${data.card.totalVisits} visites`}
          icon={<TrendingUp size={14} />}
        />
      </div>

      {/* Progression */}
      {isStamps && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Stamp size={16} /> Progression actuelle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-2">
              <p className="text-2xl font-bold">
                {data.card.currentStamps}
                <span className="text-base text-gray-400 font-normal">
                  /{maxStamps}
                </span>
              </p>
              <p className="text-xs text-gray-500">
                {maxStamps - data.card.currentStamps} tampon
                {maxStamps - data.card.currentStamps > 1 ? "s" : ""} restant
                {maxStamps - data.card.currentStamps > 1 ? "s" : ""}
              </p>
            </div>
            <div className="grid grid-cols-10 gap-1 max-w-md">
              {Array.from({ length: maxStamps }).map((_, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-full border-2 ${
                    i < data.card.currentStamps
                      ? "border-blue-500 bg-blue-500"
                      : "border-gray-200 bg-gray-50"
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes commerçant */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <StickyNote size={16} /> Notes
            <span className="text-xs font-normal text-gray-400">
              (visibles uniquement par vous)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Préfère le café noir, vient le mercredi midi…"
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.12)", color: "#f4f5f1" }}
          />
          <div className="flex justify-end mt-2 items-center gap-2">
            {notesSaved && (
              <span className="text-xs text-green-500">✓ Enregistré</span>
            )}
            <Button
              size="sm"
              onClick={saveNotes}
              disabled={savingNotes || notes === (data.card.merchantNotes ?? "")}
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {savingNotes ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timeline 2 colonnes : transactions + récompenses/campagnes */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Timeline transactions */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Stamp size={16} /> Historique d&apos;activité
              <span className="text-xs font-normal text-gray-400">
                ({data.transactions.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.transactions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">
                Pas encore d&apos;activité.
              </p>
            ) : (
              <ul className="space-y-2 max-h-96 overflow-y-auto">
                {data.transactions.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 text-sm py-2 border-b last:border-0"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {TX_LABELS[t.type] || t.type}
                        {t.value > 1 && (
                          <span className="ml-2 text-xs text-gray-500">
                            ×{t.value}
                          </span>
                        )}
                        {t.amountSpent && (
                          <span className="ml-2 text-xs text-gray-500">
                            {t.amountSpent.toFixed(2)} CHF
                          </span>
                        )}
                      </div>
                      {t.notes && (
                        <div className="text-xs text-gray-500">{t.notes}</div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 font-mono">
                      {new Date(t.createdAt).toLocaleDateString("fr-CH", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Récompenses + campagnes */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Gift size={16} /> Récompenses
                <span className="text-xs font-normal text-gray-400">
                  ({data.rewards.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.rewards.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Aucune récompense réclamée.
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.rewards.map((r) => (
                    <li
                      key={r.id}
                      className="text-sm flex flex-col py-1"
                    >
                      <span className="font-medium">{r.name}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(r.claimedAt).toLocaleDateString("fr-CH")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone size={16} /> Campagnes reçues
                <span className="text-xs font-normal text-gray-400">
                  ({data.campaigns.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.campaigns.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Aucune campagne envoyée.
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.campaigns.slice(0, 5).map((c) => (
                    <li key={c.id} className="text-sm flex flex-col py-1">
                      <span className="font-medium">
                        {c.campaign?.name || "Message direct"}
                      </span>
                      {c.campaign?.message && (
                        <span className="text-xs text-gray-500 line-clamp-2">
                          {c.campaign.message}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 font-mono">
                        {new Date(c.createdAt).toLocaleDateString("fr-CH")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal push perso */}
      {pushOpen && (
        <SendPushModal
          cardId={cardId}
          clientName={data.client.firstName}
          onClose={() => setPushOpen(false)}
          onSent={() => {
            setPushOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function InfoLine({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-400">{icon}</span>
      <div>
        <div className="text-xs text-gray-400 uppercase tracking-wider">
          {label}
        </div>
        <div className="text-gray-200 font-medium">{value}</div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg p-3 border"
      style={{
        background: "rgba(255,255,255,0.02)",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500 uppercase tracking-wider">
          {label}
        </span>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
      {sub && <div className="text-[11px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function SendPushModal({
  cardId,
  clientName,
  onClose,
  onSent,
}: {
  cardId: string;
  clientName: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  async function send() {
    setSending(true);
    setError("");
    const res = await fetch(`/api/merchants/cards/${cardId}/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erreur lors de l'envoi");
      setSending(false);
      return;
    }
    onSent();
  }

  return (
    <div
      className="recovery-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="recovery-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 460 }}
      >
        <header className="recovery-modal-head">
          <h2 style={{ fontSize: 16 }}>
            <Send
              size={15}
              style={{ display: "inline", marginRight: 8, verticalAlign: -2 }}
            />
            Envoyer une notification à {clientName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="recovery-modal-close"
          >
            ×
          </button>
        </header>
        <div className="recovery-modal-body">
          <p className="recovery-modal-explain">
            Ce message s&apos;affichera dans le Wallet du client (en notification
            push silencieuse + au verso du pass). Max 240 caractères.
          </p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ex: Une boisson offerte cette semaine, à très vite ☕"
            rows={5}
            maxLength={240}
            autoFocus
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#f4f5f1",
            }}
          />
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500">
              {message.length}/240 caractères
            </span>
            {error && <span className="text-red-400">{error}</span>}
          </div>
          <div className="flex gap-2 justify-end w-full pt-2">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              onClick={send}
              disabled={
                sending || message.trim().length === 0 || message.length > 240
              }
            >
              {sending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Envoi…
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Envoyer
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

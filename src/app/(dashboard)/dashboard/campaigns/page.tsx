"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Bell,
  Send,
  Clock,
  MapPin,
  UserMinus,
  Target,
  Milestone,
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  message: string;
  triggerType: string;
  targetSegment: string;
  status: string;
  sentCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  program?: { name: string } | null;
  _count: { logs: number };
}

interface Program {
  id: string;
  name: string;
}

const triggerIcons: Record<string, typeof Send> = {
  IMMEDIATE: Send,
  SCHEDULED: Clock,
  GEOFENCE: MapPin,
  INACTIVITY: UserMinus,
  POST_STAMP: Target,
  MILESTONE: Milestone,
};

const triggerLabels: Record<string, string> = {
  IMMEDIATE: "Immédiat",
  SCHEDULED: "Programmé",
  GEOFENCE: "Géolocalisé",
  INACTIVITY: "Win-back",
  POST_STAMP: "Après tampon",
  MILESTONE: "Palier atteint",
};

const segmentLabels: Record<string, string> = {
  ALL: "Tous les clients",
  ACTIVE: "Clients actifs",
  DORMANT: "Clients dormants",
  NEW: "Nouveaux clients",
  VIP: "Clients VIP",
};

const statusVariants: Record<string, "default" | "success" | "secondary" | "warning"> = {
  DRAFT: "secondary",
  SCHEDULED: "warning",
  SENT: "success",
  CANCELLED: "destructive" as "secondary",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/campaigns").then((r) => r.json()),
      fetch("/api/programs").then((r) => r.json()),
    ]).then(([c, p]) => {
      setCampaigns(c);
      setPrograms(p);
      setLoading(false);
    });
  }, []);

  async function fetchCampaigns() {
    const res = await fetch("/api/campaigns");
    setCampaigns(await res.json());
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campagnes</h1>
          <p className="text-gray-500">
            Envoyez des notifications à vos clients via leur wallet
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle campagne
        </Button>
      </div>

      {showForm && (
        <CreateCampaignForm
          programs={programs}
          onSuccess={() => {
            setShowForm(false);
            fetchCampaigns();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {campaigns.length === 0 && !showForm ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold">Aucune campagne</h3>
            <p className="text-gray-500 mt-1 mb-4">
              Envoyez votre première notification wallet
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Créer une campagne
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const Icon = triggerIcons[campaign.triggerType] || Bell;
            return (
              <Card key={campaign.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                        <Icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        <p className="text-sm text-gray-500 line-clamp-1">
                          {campaign.message}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm">
                        <p className="text-gray-500">
                          {triggerLabels[campaign.triggerType]}
                        </p>
                        <p className="text-xs text-gray-400">
                          {segmentLabels[campaign.targetSegment]}
                        </p>
                      </div>
                      {campaign.sentCount > 0 && (
                        <Badge variant="default">{campaign.sentCount} envoyés</Badge>
                      )}
                      <Badge variant={statusVariants[campaign.status] || "secondary"}>
                        {campaign.status === "SENT"
                          ? "Envoyé"
                          : campaign.status === "SCHEDULED"
                            ? "Programmé"
                            : campaign.status === "DRAFT"
                              ? "Brouillon"
                              : campaign.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreateCampaignForm({
  programs,
  onSuccess,
  onCancel,
}: {
  programs: Program[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [programId, setProgramId] = useState(programs[0]?.id || "");
  const [triggerType, setTriggerType] = useState("IMMEDIATE");
  const [targetSegment, setTargetSegment] = useState("ALL");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [inactivityDays, setInactivityDays] = useState(30);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    let triggerConfig: Record<string, unknown> = {};
    if (triggerType === "SCHEDULED" && scheduledDate && scheduledTime) {
      triggerConfig = { sendAt: `${scheduledDate}T${scheduledTime}:00Z` };
    } else if (triggerType === "INACTIVITY") {
      triggerConfig = { daysInactive: inactivityDays };
    } else if (triggerType === "GEOFENCE") {
      triggerConfig = { radiusM: 500, message };
    }

    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        programId,
        name,
        message,
        triggerType,
        triggerConfig,
        targetSegment,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erreur");
      setSaving(false);
      return;
    }

    onSuccess();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouvelle campagne</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom de la campagne</label>
              <Input
                placeholder="Happy Hour vendredi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Programme</label>
              <select
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
              >
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <textarea
              className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
              placeholder="Votre message apparaîtra sur l'écran de verrouillage de vos clients"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
            <p className="text-xs text-gray-400">
              Ce message apparaît en notification push sur le wallet du client
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Déclencheur</label>
              <select
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value)}
              >
                <option value="IMMEDIATE">Envoi immédiat</option>
                <option value="SCHEDULED">Date/heure précise</option>
                <option value="GEOFENCE">Proximité du commerce</option>
                <option value="INACTIVITY">Client inactif (win-back)</option>
                <option value="POST_STAMP">Après tamponnage</option>
                <option value="MILESTONE">Palier de tampons atteint</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Segment ciblé</label>
              <select
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                value={targetSegment}
                onChange={(e) => setTargetSegment(e.target.value)}
              >
                <option value="ALL">Tous les clients</option>
                <option value="ACTIVE">Clients actifs (30 derniers jours)</option>
                <option value="DORMANT">Clients dormants (30+ jours)</option>
                <option value="NEW">Nouveaux (7 derniers jours)</option>
                <option value="VIP">VIP (10+ visites)</option>
              </select>
            </div>
          </div>

          {/* Conditional fields */}
          {triggerType === "SCHEDULED" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Heure</label>
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {triggerType === "INACTIVITY" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Jours d&apos;inactivité avant envoi
              </label>
              <Input
                type="number"
                min={7}
                max={365}
                value={inactivityDays}
                onChange={(e) => setInactivityDays(parseInt(e.target.value))}
              />
            </div>
          )}

          {triggerType === "GEOFENCE" && (
            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
              La notification sera envoyée automatiquement quand le client passe
              à proximité de votre commerce (rayon de 500m). Cette fonctionnalité
              utilise les capacités natives d&apos;Apple Wallet — aucun tracking du client.
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Envoi..."
                : triggerType === "IMMEDIATE"
                  ? "Envoyer maintenant"
                  : "Programmer"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

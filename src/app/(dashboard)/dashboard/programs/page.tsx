"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Stamp, Award, Percent, Layers, ExternalLink, Bell, CheckCircle, AlertCircle } from "lucide-react";

interface Program {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  config: Record<string, unknown>;
  cardDesign: Record<string, unknown>;
  googleReviewEnabled: boolean;
  rewards: { id: string; name: string; threshold: number; rewardType: string }[];
  cards: { serialNumber: string; client: { firstName: string } }[];
  _count: { cards: number };
}

const typeLabels: Record<string, { label: string; icon: typeof Stamp }> = {
  STAMPS: { label: "Tampons", icon: Stamp },
  POINTS: { label: "Points", icon: Award },
  CASHBACK: { label: "Cashback", icon: Percent },
  HYBRID: { label: "Hybride", icon: Layers },
};

export default function ProgramsPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [pushStatus, setPushStatus] = useState<Record<string, "idle" | "loading" | "ok" | "error">>({});

  async function testPush(serialNumber: string) {
    setPushStatus((s) => ({ ...s, [serialNumber]: "loading" }));
    const res = await fetch("/api/debug/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serialNumber }),
    });
    const data = await res.json();
    setPushStatus((s) => ({ ...s, [serialNumber]: data.sent > 0 ? "ok" : "error" }));
    setTimeout(() => setPushStatus((s) => ({ ...s, [serialNumber]: "idle" })), 4000);
  }

  useEffect(() => {
    fetchPrograms();
  }, []);

  async function fetchPrograms() {
    const res = await fetch("/api/programs");
    const data = await res.json();
    setPrograms(data);
    setLoading(false);
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
          <h1 className="text-2xl font-bold text-gray-900">Programmes de fidélité</h1>
          <p className="text-gray-500">Gérez vos programmes et récompenses</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau programme
        </Button>
      </div>

      {showForm && (
        <CreateProgramForm
          onSuccess={(programId) => {
            setShowForm(false);
            if (programId) {
              router.push(`/dashboard/programs/${programId}/customize?wizard=true`);
            } else {
              fetchPrograms();
            }
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {programs.length === 0 && !showForm ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Stamp className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Aucun programme</h3>
            <p className="text-gray-500 mt-1 mb-4">
              Créez votre premier programme de fidélité
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Créer un programme
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {programs.map((program) => {
            const typeInfo = typeLabels[program.type] || typeLabels.STAMPS;
            const Icon = typeInfo.icon;
            return (
              <Card key={program.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg">{program.name}</CardTitle>
                  <Badge variant={program.isActive ? "success" : "secondary"}>
                    {program.isActive ? "Actif" : "Inactif"}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                    <Icon className="h-4 w-4" />
                    <span>{typeInfo.label}</span>
                    <span className="mx-1">|</span>
                    <span>{program._count.cards} clients</span>
                  </div>
                  {program.rewards.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-400 uppercase">Récompenses</p>
                      {program.rewards.map((reward) => (
                        <div
                          key={reward.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>{reward.name}</span>
                          <Badge variant="outline">{reward.threshold} requis</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                  {program.googleReviewEnabled && (
                    <div className="mt-3 flex items-center gap-1 text-xs text-green-600">
                      <Award className="h-3 w-3" />
                      Bonus avis Google activé
                    </div>
                  )}

                  {program.cards.length > 0 && (
                    <div className="mt-4 border-t pt-3 space-y-1">
                      <p className="text-xs font-medium text-gray-400 uppercase">Cartes — tester Wallet</p>
                      {program.cards.map((card) => {
                        const status = pushStatus[card.serialNumber] || "idle";
                        return (
                          <div key={card.serialNumber} className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 font-mono">{card.client.firstName} · {card.serialNumber}</span>
                            <div className="flex items-center gap-2">
                              <a
                                href={`/api/wallet/apple/${card.serialNumber}.pkpass`}
                                target="_blank"
                                className="flex items-center gap-1 text-blue-600 hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Wallet
                              </a>
                              <button
                                onClick={() => testPush(card.serialNumber)}
                                disabled={status === "loading"}
                                className="flex items-center gap-1 text-purple-600 hover:underline disabled:opacity-50"
                              >
                                {status === "loading" && <span className="h-3 w-3 animate-spin rounded-full border-2 border-purple-600 border-t-transparent inline-block" />}
                                {status === "ok" && <CheckCircle className="h-3 w-3 text-green-600" />}
                                {status === "error" && <AlertCircle className="h-3 w-3 text-red-500" />}
                                {status === "idle" && <Bell className="h-3 w-3" />}
                                {status === "ok" ? "Envoyé !" : status === "error" ? "Échec" : "Push"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreateProgramForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (programId?: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState("STAMPS");
  const [maxStamps, setMaxStamps] = useState(10);
  const [rewardName, setRewardName] = useState("");
  const [bgColor, setBgColor] = useState("#1a1a2e");
  const [textColor, setTextColor] = useState("#ffffff");
  const [googleReviewEnabled, setGoogleReviewEnabled] = useState(false);
  const [googleReviewBonus, setGoogleReviewBonus] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const config =
      type === "STAMPS"
        ? { maxStamps, reward: rewardName }
        : type === "POINTS"
          ? { pointsPerChf: 1, tiers: [{ points: maxStamps, reward: rewardName }] }
          : type === "CASHBACK"
            ? { percentage: 5, minSpend: 10 }
            : { maxStamps, pointsPerChf: 1 };

    const res = await fetch("/api/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type,
        config,
        cardDesign: {
          bgColor,
          textColor,
          description: `Programme ${name}`,
        },
        rewards:
          rewardName
            ? [
                {
                  name: rewardName,
                  threshold: maxStamps,
                  rewardType: "FREE_ITEM",
                },
              ]
            : [],
        googleReviewEnabled,
        googleReviewBonus: googleReviewEnabled ? googleReviewBonus : 0,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erreur lors de la création");
      setSaving(false);
      return;
    }

    const created = await res.json().catch(() => null);
    const newId =
      created && typeof created === "object" && typeof (created as { id?: unknown }).id === "string"
        ? (created as { id: string }).id
        : undefined;
    onSuccess(newId);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveau programme</CardTitle>
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
              <label className="text-sm font-medium">Nom du programme</label>
              <Input
                placeholder="Mon programme fidélité"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <select
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="STAMPS">Carte à tampons</option>
                <option value="POINTS">Points cumulables</option>
                <option value="CASHBACK">Cashback</option>
                <option value="HYBRID">Hybride</option>
              </select>
            </div>

            {(type === "STAMPS" || type === "HYBRID") && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Nombre de tampons pour la récompense
                </label>
                <Input
                  type="number"
                  min={2}
                  max={50}
                  value={maxStamps}
                  onChange={(e) => setMaxStamps(parseInt(e.target.value))}
                />
              </div>
            )}

            {type === "POINTS" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Points nécessaires pour la récompense
                </label>
                <Input
                  type="number"
                  min={10}
                  value={maxStamps}
                  onChange={(e) => setMaxStamps(parseInt(e.target.value))}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Récompense</label>
              <Input
                placeholder="1 café offert"
                value={rewardName}
                onChange={(e) => setRewardName(e.target.value)}
              />
            </div>
          </div>

          {/* Card Design */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Design de la carte</label>
            <div className="flex gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Fond</label>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded border"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Texte</label>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded border"
                />
              </div>
              {/* Preview */}
              <div
                className="flex-1 rounded-xl p-4 flex items-center justify-between"
                style={{ backgroundColor: bgColor, color: textColor }}
              >
                <div>
                  <p className="text-xs opacity-70">Programme</p>
                  <p className="font-bold">{name || "Mon programme"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-70">
                    {type === "STAMPS" ? "Tampons" : "Points"}
                  </p>
                  <p className="text-2xl font-bold">
                    0/{maxStamps}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Google Review Bonus */}
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={googleReviewEnabled}
                onChange={(e) => setGoogleReviewEnabled(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium">
                Bonus pour avis Google
              </span>
            </label>
            {googleReviewEnabled && (
              <div className="ml-6 space-y-2">
                <label className="text-sm text-gray-500">
                  Tampons/points bonus par avis
                </label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={googleReviewBonus}
                  onChange={(e) => setGoogleReviewBonus(parseInt(e.target.value))}
                  className="w-24"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Création..." : "Créer le programme"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

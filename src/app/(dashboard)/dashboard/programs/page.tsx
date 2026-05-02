"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Stamp, Award, Percent, Layers, Trash2, ExternalLink } from "lucide-react";

interface Program {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  config: Record<string, unknown>;
  cardDesign: Record<string, unknown>;
  googleReviewEnabled: boolean;
  rewards: { id: string; name: string; threshold: number; rewardType: string }[];
  _count: { cards: number };
}

/* ─── Read-only wallet card preview ──────────────────────── */
function ProgramCardPreview({ program }: { program: Program }) {
  const design = program.cardDesign || {};
  const bg = (design.bgColor as string) || "#0e110b";
  const fg = (design.textColor as string) || "#f4f5f1";
  const config = program.config || {};
  const max =
    (config.maxStamps as number) ||
    ((config.tiers as { points: number }[])?.[0]?.points) ||
    10;
  const reward =
    program.rewards[0]?.name ||
    (config.reward as string) ||
    "1 récompense offerte";
  const sampleStamps = Math.min(6, max);

  // Detect if bg is bright to pick contrast for stamps
  const isDarkBg = isDark(bg);
  const stampOn = "#d4ff4e";
  const stampOff = isDarkBg ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)";
  const dim = isDarkBg ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.6)";

  const logoData = (design.logoData as string) || "";

  return (
    <div className="program-preview" style={{ background: bg, color: fg }}>
      <div className="program-preview-shine" />

      <div className="program-preview-head">
        {logoData ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoData}
            alt="Logo"
            className="program-preview-logo"
          />
        ) : (
          <span className="program-preview-brand" style={{ color: stampOn }}>
            FIDLIFY · WALLET
          </span>
        )}
        <span className="program-preview-chip" style={{ background: stampOn }} />
      </div>

      <div className="program-preview-name" style={{ color: dim }}>
        Carte de fidélité
      </div>
      <div className="program-preview-shop">{program.name}</div>

      <div className="program-preview-stamps">
        {Array.from({ length: max }).map((_, i) => {
          const filled = i < sampleStamps;
          return (
            <span
              key={i}
              className={`program-preview-stamp${filled ? " full" : ""}`}
              style={{
                background: filled ? stampOn : "transparent",
                borderColor: filled ? stampOn : stampOff,
                color: filled ? "#0a0d04" : "transparent",
              }}
            >
              {filled ? "★" : ""}
            </span>
          );
        })}
      </div>

      <div className="program-preview-foot">
        <span className="program-preview-progress" style={{ color: dim }}>
          <strong style={{ color: fg }}>
            {sampleStamps}
          </strong>
          /{max} · {reward}
        </span>
        <span className="program-preview-qr" />
      </div>

      <div className="program-preview-tag">APERÇU</div>
    </div>
  );
}

function isDark(hex: string) {
  const m = hex.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return true;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // perceived luminance
  return (0.299 * r + 0.587 * g + 0.114 * b) < 140;
}

const typeLabels: Record<string, { label: string; icon: typeof Stamp }> = {
  STAMPS: { label: "Tampons", icon: Stamp },
  POINTS: { label: "Points", icon: Award },
  CASHBACK: { label: "Cashback", icon: Percent },
  HYBRID: { label: "Hybride", icon: Layers },
};

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchPrograms();
  }, []);

  async function deleteProgram(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/programs/${id}`, { method: "DELETE" });
    setDeletingId(null);
    setConfirmDeleteId(null);
    if (res.ok) {
      fetchPrograms();
    } else {
      const data = await res.json();
      alert(data.error || "Erreur lors de la suppression");
    }
  }

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
          onSuccess={() => {
            setShowForm(false);
            fetchPrograms();
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
                  {/* Live wallet card preview (read-only) */}
                  <ProgramCardPreview program={program} />

                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-3 mt-4">
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
                  <div className="mt-4 flex gap-2">
                    <a
                      href={`/join/${program.id}`}
                      target="_blank"
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Lien client
                    </a>
                    <div className="flex-1" />
                    {confirmDeleteId === program.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Confirmer ?</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteProgram(program.id)}
                          disabled={deletingId === program.id}
                          className="h-7 px-2 text-xs"
                        >
                          {deletingId === program.id ? "..." : "Oui, supprimer"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirmDeleteId(null)}
                          className="h-7 px-2 text-xs"
                        >
                          Annuler
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmDeleteId(program.id)}
                        className="h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Supprimer
                      </Button>
                    )}
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

/* ─── Aperçu live de la carte Apple Wallet (utilisé dans le formulaire) ─ */
function WalletCardPreview({
  bgColor,
  textColor,
  programName,
  maxStamps,
  logoData,
}: {
  bgColor: string;
  textColor: string;
  programName: string;
  maxStamps: number;
  logoData?: string;
}) {
  const total = Math.max(1, Math.min(20, maxStamps || 10));
  const rows = total <= 5 ? 1 : 2;
  const perRow = Math.ceil(total / rows);
  const isDarkBg = isDark(bgColor);
  const stampStroke = isDarkBg ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";
  const dim = isDarkBg ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.6)";

  return (
    <div
      className="wcp"
      style={{ background: bgColor, color: textColor }}
    >
      {/* Header : logo top-left, OFFRE top-right */}
      <div className="wcp-head">
        {logoData ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoData} alt="Logo" className="wcp-logo" />
        ) : (
          <span className="wcp-logo-empty" style={{ color: dim }}>
            Logo
          </span>
        )}
        <div className="wcp-offer">
          <span style={{ color: dim }}>OFFRE</span>
        </div>
      </div>

      {/* Strip : 1 ou 2 rangées de cercles */}
      <div
        className="wcp-stamps"
        style={{
          gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className="wcp-stamp"
            style={{ borderColor: stampStroke }}
          />
        ))}
      </div>

      {/* Secondary fields : TAMPONS REQUIS (gauche) + PROGRAMME (droite) */}
      <div className="wcp-fields">
        <div className="wcp-field">
          <span className="wcp-label" style={{ color: dim }}>
            TAMPONS REQUIS POUR LA RÉCOMPENSE
          </span>
          <span className="wcp-value">{maxStamps}</span>
        </div>
        <div className="wcp-field" style={{ textAlign: "right" }}>
          <span className="wcp-label" style={{ color: dim }}>
            PROGRAMME
          </span>
          <span className="wcp-value">{programName || "—"}</span>
        </div>
      </div>

      {/* Mock QR */}
      <div className="wcp-qr-wrap">
        <span className="wcp-qr" />
      </div>
    </div>
  );
}

function CreateProgramForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState("STAMPS");
  const [maxStamps, setMaxStamps] = useState(10);
  const [rewardName, setRewardName] = useState("");
  const [bgColor, setBgColor] = useState("#1a1a2e");
  const [textColor, setTextColor] = useState("#ffffff");
  const [logoData, setLogoData] = useState<string>(""); // base64 data URL
  const [logoError, setLogoError] = useState<string>("");
  const [googleReviewEnabled, setGoogleReviewEnabled] = useState(false);
  const [googleReviewBonus, setGoogleReviewBonus] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLogoError("");
    const file = e.target.files?.[0];
    if (!file) {
      setLogoData("");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setLogoError("Le fichier doit être une image");
      return;
    }
    if (file.size > 500 * 1024) {
      setLogoError("Image trop lourde (max 500 KB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoData(reader.result as string);
    reader.onerror = () => setLogoError("Erreur de lecture du fichier");
    reader.readAsDataURL(file);
  }

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
          logoData: logoData || undefined,
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

    onSuccess();
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
          <div className="space-y-3">
            <label className="text-sm font-medium">Design de la carte</label>

            {/* Logo upload */}
            <div className="space-y-2">
              <label className="text-xs text-gray-500">Logo (haut-gauche de la carte) — PNG/JPG, max 500 KB</label>
              <div className="flex items-center gap-3">
                {logoData ? (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoData}
                      alt="Logo"
                      className="h-14 w-14 rounded-lg object-contain border"
                      style={{ background: bgColor }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setLogoData("")}
                    >
                      Retirer
                    </Button>
                  </div>
                ) : (
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleLogoChange}
                    className="text-sm"
                  />
                )}
              </div>
              {logoError && (
                <p className="text-xs text-red-500">{logoError}</p>
              )}
            </div>

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
              {/* Live preview = vraie carte Apple Wallet */}
              <div className="flex-1 flex justify-center">
                <WalletCardPreview
                  bgColor={bgColor}
                  textColor={textColor}
                  programName={name || "Mon programme"}
                  maxStamps={maxStamps}
                  logoData={logoData}
                />
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

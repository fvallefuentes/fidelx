"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Stamp, Award, Percent, Layers, Trash2, ExternalLink, Lock, Palette, X, Eye, Archive } from "lucide-react";
import ClientPreviewModal from "@/components/dashboard/ClientPreviewModal";

interface Program {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  config: Record<string, unknown>;
  cardDesign: Record<string, unknown>;
  googleReviewEnabled: boolean;
  googleReviewBonus?: number;
  googleReviewMinVisits?: number;
  establishmentId?: string | null;
  rewards: { id: string; name: string; threshold: number; rewardType: string }[];
  _count: { cards: number };
}

/* ─── Read-only wallet card preview ──────────────────────── */
function ProgramCardPreview({ program }: { program: Program }) {
  const design = program.cardDesign || {};
  const config = program.config || {};
  const max =
    (config.maxStamps as number) ||
    ((config.tiers as { points: number }[])?.[0]?.points) ||
    10;

  return (
    <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
      <WalletCardPreview
        bgColor={(design.bgColor as string) || "#1a1a2e"}
        textColor={(design.textColor as string) || "#ffffff"}
        stampColor={design.stampColor as string | undefined}
        stampCheckColor={design.stampCheckColor as string | undefined}
        stampEmptyColor={design.stampEmptyColor as string | undefined}
        labelColor={design.labelColor as string | undefined}
        logoData={(design.logoData as string) || undefined}
        programName={program.name}
        maxStamps={max}
      />
      <span className="wcp-tag">APERÇU</span>
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

/* ─── Thèmes pré-configurés ─────────────────────────────── */
const CARD_PRESETS = [
  {
    id: "midnight",
    name: "Midnight",
    bgColor: "#1a1a2e",
    textColor: "#ffffff",
    stampColor: "#ffffff",
    stampCheckColor: "#1a1a2e",
    stampEmptyColor: "#ffffff",
    labelColor: "#a0a3aa",
  },
  {
    id: "lime",
    name: "Lime",
    bgColor: "#0e110b",
    textColor: "#f4f5f1",
    stampColor: "#d4ff4e",
    stampCheckColor: "#0a0d04",
    stampEmptyColor: "#d4ff4e",
    labelColor: "#8a8e84",
  },
  {
    id: "coffee",
    name: "Café",
    bgColor: "#3b2415",
    textColor: "#f6e9d8",
    stampColor: "#f6e9d8",
    stampCheckColor: "#3b2415",
    stampEmptyColor: "#c8a778",
    labelColor: "#c8a778",
  },
  {
    id: "rose",
    name: "Rose",
    bgColor: "#f4d7d4",
    textColor: "#3a1a1a",
    stampColor: "#3a1a1a",
    stampCheckColor: "#f4d7d4",
    stampEmptyColor: "#a85a5a",
    labelColor: "#7a3232",
  },
  {
    id: "ocean",
    name: "Océan",
    bgColor: "#0e3a59",
    textColor: "#ffffff",
    stampColor: "#82d8ff",
    stampCheckColor: "#0e3a59",
    stampEmptyColor: "#82d8ff",
    labelColor: "#9ec0d6",
  },
  {
    id: "forest",
    name: "Forêt",
    bgColor: "#1f3d2b",
    textColor: "#ecf5ec",
    stampColor: "#aee087",
    stampCheckColor: "#1f3d2b",
    stampEmptyColor: "#aee087",
    labelColor: "#9eb3a0",
  },
  {
    id: "sunset",
    name: "Sunset",
    bgColor: "#ff5e3a",
    textColor: "#fff",
    stampColor: "#ffe27a",
    stampCheckColor: "#ff5e3a",
    stampEmptyColor: "#ffe27a",
    labelColor: "#ffd0b8",
  },
  {
    id: "minimal",
    name: "Minimal",
    bgColor: "#f5f5f5",
    textColor: "#0a0a0a",
    stampColor: "#0a0a0a",
    stampCheckColor: "#f5f5f5",
    stampEmptyColor: "#0a0a0a",
    labelColor: "#7a7a7a",
  },
];

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [previewingProgram, setPreviewingProgram] = useState<Program | null>(null);
  const [togglingReviewId, setTogglingReviewId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  async function fetchPrograms() {
    const res = await fetch("/api/programs");
    const data = await res.json();
    setPrograms(data);
    setLoading(false);
  }

  /**
   * Toggle rapide de l'avis Google directement depuis la liste (sans ouvrir
   * la modal). Update optimiste de l'état local + PATCH.
   */
  async function toggleReview(program: Program) {
    const next = !program.googleReviewEnabled;
    setTogglingReviewId(program.id);
    // Optimiste
    setPrograms((prev) =>
      prev.map((p) =>
        p.id === program.id ? { ...p, googleReviewEnabled: next } : p
      )
    );
    try {
      const res = await fetch(`/api/programs/${program.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleReviewEnabled: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Rollback si échec
      setPrograms((prev) =>
        prev.map((p) =>
          p.id === program.id ? { ...p, googleReviewEnabled: !next } : p
        )
      );
    } finally {
      setTogglingReviewId(null);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadPrograms() {
      const res = await fetch("/api/programs");
      const data = await res.json();
      if (cancelled) return;
      setPrograms(data);
      setLoading(false);
    }

    loadPrograms().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function deleteProgram(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/programs/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setDeletingId(null);
    setConfirmDeleteId(null);
    if (res.ok) {
      if (data.action === "archived") {
        alert(
          `Programme archivÃ©. ${data.expiredCards ?? 0} carte(s) client ont Ã©tÃ© rendues obsolÃ¨tes.`
        );
      }
      fetchPrograms();
    } else {
      alert(data.error || "Erreur lors de l'archivage");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const activeCount = programs.filter((p) => p.isActive).length;
  const archivedCount = programs.length - activeCount;
  const visiblePrograms =
    activeTab === "active"
      ? programs.filter((p) => p.isActive)
      : programs.filter((p) => !p.isActive);

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

      {/* Tabs Actifs / Archivés (cachés si pas de programme du tout) */}
      {programs.length > 0 && (
        <div className="flex gap-1 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              activeTab === "active"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Actifs ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("archived")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition flex items-center gap-1.5 ${
              activeTab === "archived"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Archive className="h-3.5 w-3.5" />
            Archivés ({archivedCount})
          </button>
        </div>
      )}

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
      ) : visiblePrograms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            {activeTab === "archived" ? (
              <>
                <Archive className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Aucun programme archivé
                </h3>
                <p className="text-gray-500 mt-1">
                  Les programmes que tu archives apparaîtront ici.
                </p>
              </>
            ) : (
              <>
                <Stamp className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Aucun programme actif
                </h3>
                <p className="text-gray-500 mt-1 mb-4">
                  Tous tes programmes sont archivés. Crée-en un nouveau ou consulte
                  l&apos;onglet Archivés.
                </p>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un programme
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visiblePrograms.map((program) => {
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
                  {/* Toggle rapide Avis Google */}
                  <div className="mt-3 flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Award className="h-3.5 w-3.5 text-amber-500" />
                      <span>
                        Bonus avis Google
                        <span className={`ml-1.5 font-medium ${program.googleReviewEnabled ? "text-green-600" : "text-gray-400"}`}>
                          {program.googleReviewEnabled ? "Activé" : "Désactivé"}
                        </span>
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={program.googleReviewEnabled}
                      disabled={togglingReviewId === program.id}
                      onClick={() => toggleReview(program)}
                      title={program.googleReviewEnabled ? "Désactiver" : "Activer"}
                      style={{
                        position: "relative",
                        width: 38,
                        height: 22,
                        borderRadius: 999,
                        border: "none",
                        cursor: togglingReviewId === program.id ? "wait" : "pointer",
                        background: program.googleReviewEnabled ? "#22c55e" : "#d1d5db",
                        transition: "background 0.2s",
                        opacity: togglingReviewId === program.id ? 0.6 : 1,
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          top: 2,
                          left: program.googleReviewEnabled ? 18 : 2,
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: "#fff",
                          transition: "left 0.2s",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                        }}
                      />
                    </button>
                  </div>
                  {program.googleReviewEnabled && !program.establishmentId && (
                    <p className="mt-1.5 text-xs text-amber-600">
                      ⚠️ Liez un établissement avec un Google Place ID (Modifier le design) pour que les avis fonctionnent.
                    </p>
                  )}
                  <div className="mt-4 flex gap-2 flex-wrap items-center">
                    <button
                      type="button"
                      onClick={() => setPreviewingProgram(program)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      title="Voir l'interface telle qu'un client la voit"
                    >
                      <Eye className="h-3 w-3" />
                      Voir comme un client
                    </button>
                    <a
                      href={`/join/${program.id}`}
                      target="_blank"
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Lien client
                    </a>
                    <button
                      type="button"
                      onClick={() => setEditingProgram(program)}
                      className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                    >
                      <Palette className="h-3 w-3" />
                      Modifier le design
                    </button>
                    <div className="flex-1" />
                    {!program.isActive ? (
                      <span className="text-xs text-gray-400">ArchivÃ©</span>
                    ) : confirmDeleteId === program.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {program._count.cards > 0 ? "Archiver ce programme ?" : "Supprimer ce programme ?"}
                        </span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteProgram(program.id)}
                          disabled={deletingId === program.id}
                          className="h-7 px-2 text-xs"
                        >
                          {deletingId === program.id
                            ? "..."
                            : program._count.cards > 0
                              ? "Oui, archiver"
                              : "Oui, supprimer"}
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
                        {program._count.cards > 0 ? (
                          <Archive className="h-3 w-3 mr-1" />
                        ) : (
                          <Trash2 className="h-3 w-3 mr-1" />
                        )}
                        {program._count.cards > 0 ? "Archiver" : "Supprimer"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {editingProgram && (
        <EditProgramDesignModal
          program={editingProgram}
          onClose={() => setEditingProgram(null)}
          onSaved={() => {
            setEditingProgram(null);
            fetchPrograms();
          }}
        />
      )}

      {previewingProgram && (
        <ClientPreviewModal
          programId={previewingProgram.id}
          programName={previewingProgram.name}
          open={!!previewingProgram}
          onClose={() => setPreviewingProgram(null)}
        />
      )}
    </div>
  );
}

/* ─── Color picker compact ──────────────────────────────── */
function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 cursor-pointer rounded border"
      />
      <div className="flex flex-col">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-[10px] text-gray-400 font-mono">{value}</span>
      </div>
    </div>
  );
}

/* ─── Aperçu live de la carte Apple Wallet (utilisé dans le formulaire) ─ */
function WalletCardPreview({
  bgColor,
  textColor,
  stampColor,
  stampCheckColor,
  stampEmptyColor,
  labelColor,
  programName,
  maxStamps,
  logoData,
}: {
  bgColor: string;
  textColor: string;
  stampColor?: string;
  stampCheckColor?: string;
  stampEmptyColor?: string;
  labelColor?: string;
  programName: string;
  maxStamps: number;
  logoData?: string;
}) {
  const total = Math.max(1, Math.min(20, maxStamps || 10));
  const rows = total <= 5 ? 1 : 2;
  const perRow = Math.ceil(total / rows);
  const isDarkBg = isDark(bgColor);

  // Defaults intelligents
  const sFill = stampColor || (isDarkBg ? "#ffffff" : "#0a0a0a");
  const sCheck = stampCheckColor || bgColor;
  const sEmpty = stampEmptyColor || sFill;
  const lblColor = labelColor || (isDarkBg ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.6)");

  // 3 tampons remplis pour donner une idée
  const sampleFilled = Math.min(3, total);

  return (
    <div className="wcp" style={{ background: bgColor, color: textColor }}>
      {/* Header : logo top-left, OFFRE top-right */}
      <div className="wcp-head">
        {logoData ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoData} alt="Logo" className="wcp-logo" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={isDarkBg ? "/powered_by_fidlify_white.png" : "/powered_by_fidlify_black.svg"}
            alt="Powered by Fidlify"
            style={{ height: 22, width: "auto", objectFit: "contain", display: "block" }}
          />
        )}
        <div className="wcp-offer">
          <span style={{ color: lblColor }}>OFFRE</span>
        </div>
      </div>

      {/* Strip : 1 ou 2 rangées de cercles */}
      <div
        className="wcp-stamps"
        style={{ gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: total }).map((_, i) => {
          const filled = i < sampleFilled;
          return (
            <span
              key={i}
              className="wcp-stamp"
              style={{
                borderColor: filled ? sFill : sEmpty,
                background: filled ? sFill : "transparent",
                color: sCheck,
              }}
            >
              {filled && (
                <svg viewBox="0 0 24 24" width="60%" height="60%" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </span>
          );
        })}
      </div>

      {/* Secondary fields : TAMPONS REQUIS + PROGRAMME */}
      <div className="wcp-fields">
        <div className="wcp-field">
          <span className="wcp-label" style={{ color: lblColor }}>
            TAMPONS REQUIS POUR LA RÉCOMPENSE
          </span>
          <span className="wcp-value">{maxStamps}</span>
        </div>
        <div className="wcp-field" style={{ textAlign: "right" }}>
          <span className="wcp-label" style={{ color: lblColor }}>
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
  const { data: session } = useSession();
  const plan = (session?.user?.plan as string) || "FREE";
  const isFree = plan === "FREE";
  const [name, setName] = useState("");
  const [type, setType] = useState("STAMPS");
  const [maxStamps, setMaxStamps] = useState(10);
  const [rewardName, setRewardName] = useState("");
  const [bgColor, setBgColor] = useState("#1a1a2e");
  const [textColor, setTextColor] = useState("#ffffff");
  const [stampColor, setStampColor] = useState("#ffffff"); // fill des cercles tampons obtenus
  const [stampCheckColor, setStampCheckColor] = useState("#1a1a2e"); // ✓ à l'intérieur
  const [stampEmptyColor, setStampEmptyColor] = useState("#ffffff"); // outline cercles vides
  const [labelColor, setLabelColor] = useState("#a0a3aa"); // texte OFFRE / TAMPONS REQUIS
  const [logoData, setLogoData] = useState<string>("");
  const [logoError, setLogoError] = useState<string>("");
  const [googleReviewEnabled, setGoogleReviewEnabled] = useState(false);
  const [googleReviewBonus, setGoogleReviewBonus] = useState(1);
  const [googleReviewMinVisits, setGoogleReviewMinVisits] = useState(3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function applyPreset(p: typeof CARD_PRESETS[number]) {
    setBgColor(p.bgColor);
    setTextColor(p.textColor);
    setStampColor(p.stampColor);
    setStampCheckColor(p.stampCheckColor);
    setStampEmptyColor(p.stampEmptyColor);
    setLabelColor(p.labelColor);
  }

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
          stampColor,
          stampCheckColor,
          stampEmptyColor,
          labelColor,
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
        googleReviewMinVisits: googleReviewEnabled ? googleReviewMinVisits : 3,
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
                <option value="POINTS" disabled={isFree}>
                  Points cumulables{isFree ? " — 🔒 Pro" : ""}
                </option>
                <option value="CASHBACK" disabled={isFree}>
                  Cashback{isFree ? " — 🔒 Pro" : ""}
                </option>
                <option value="HYBRID" disabled={isFree}>
                  Hybride{isFree ? " — 🔒 Pro" : ""}
                </option>
              </select>
              {isFree && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Plan Gratuit : tampons uniquement. Essentiel débloque points, cashback et hybride.
                </p>
              )}
            </div>

            {(type === "STAMPS" || type === "HYBRID") && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Nombre de tampons pour la récompense
                </label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={maxStamps}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    if (Number.isNaN(v)) return;
                    setMaxStamps(Math.max(1, Math.min(20, v)));
                  }}
                />
                <p className="text-xs text-gray-400">Entre 1 et 20 tampons.</p>
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
          <div className="space-y-4">
            <label className="text-sm font-medium">Design de la carte</label>

            {/* Logo upload */}
            <div className="space-y-2">
              <label className="text-xs text-gray-500">Logo (haut-gauche de la carte) — PNG/JPG, max 500 KB</label>
              {isFree ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-400">
                  Logo personnalisé non disponible sur le plan Gratuit — le logo Fidlify est affiché à la place.
                </div>
              ) : (
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
                      <Button type="button" variant="outline" size="sm" onClick={() => setLogoData("")}>
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
              )}
              {logoError && <p className="text-xs text-red-500">{logoError}</p>}
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <label className="text-xs text-gray-500">Thèmes prêts à l&apos;emploi</label>
              <div className="flex flex-wrap gap-2">
                {CARD_PRESETS.map((p) => {
                  const active =
                    p.bgColor === bgColor && p.stampColor === stampColor;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        active
                          ? "border-[var(--accent,#d4ff4e)]"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      title={p.name}
                    >
                      <span
                        className="h-4 w-4 rounded-full border"
                        style={{ background: p.bgColor, borderColor: p.stampEmptyColor }}
                      />
                      <span
                        className="h-4 w-4 rounded-full"
                        style={{ background: p.stampColor }}
                      />
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Couleurs personnalisées + preview live */}
            <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
              <div className="grid grid-cols-2 gap-3 content-start min-w-[260px]">
                <ColorPicker label="Fond"          value={bgColor}          onChange={setBgColor} />
                <ColorPicker label="Texte"         value={textColor}        onChange={setTextColor} />
                <ColorPicker label="Tampon ✓"      value={stampColor}       onChange={setStampColor} />
                <ColorPicker label="Coche du ✓"    value={stampCheckColor}  onChange={setStampCheckColor} />
                <ColorPicker label="Cercle vide"   value={stampEmptyColor}  onChange={setStampEmptyColor} />
                <ColorPicker label="Labels"        value={labelColor}       onChange={setLabelColor} />
              </div>

              <div className="flex justify-center">
                <WalletCardPreview
                  bgColor={bgColor}
                  textColor={textColor}
                  stampColor={stampColor}
                  stampCheckColor={stampCheckColor}
                  stampEmptyColor={stampEmptyColor}
                  labelColor={labelColor}
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
                Récompenser un avis Google
              </span>
            </label>
            {googleReviewEnabled && (
              <div className="ml-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm text-gray-500">
                    Bonus par avis ({type === "POINTS" || type === "CASHBACK" ? "points" : "tampons"})
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={googleReviewBonus}
                    onChange={(e) => setGoogleReviewBonus(parseInt(e.target.value) || 1)}
                    className="w-24"
                  />
                  <p className="text-xs text-gray-400">
                    Type déterminé automatiquement selon le programme :{" "}
                    {type === "POINTS" || type === "CASHBACK" ? "points" : "tampons"}.
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-500">
                    Proposer l&apos;avis après combien de visites ?
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={googleReviewMinVisits}
                    onChange={(e) => setGoogleReviewMinVisits(parseInt(e.target.value) || 1)}
                    className="w-24"
                  />
                  <p className="text-xs text-gray-400">
                    Le client ne verra la proposition qu&apos;après ce nombre de visites.
                  </p>
                </div>
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2.5">
                  ⚠️ Nécessite un <strong>Google Place ID</strong> configuré sur votre
                  établissement (Paramètres). La validation se fait manuellement
                  depuis l&apos;onglet « Avis Google ».
                </div>
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

/* ═══════════════════════════════════════════════════════════
   MODAL — Modifier le design d'un programme existant
   (Le nombre de tampons et le type ne sont PAS modifiables car
   cela casserait les progressions des cartes déjà émises.)
   ═══════════════════════════════════════════════════════════ */
function EditProgramDesignModal({
  program,
  onClose,
  onSaved,
}: {
  program: Program;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: session } = useSession();
  const plan = (session?.user?.plan as string) || "FREE";
  const isFree = plan === "FREE";
  const design = (program.cardDesign || {}) as Record<string, string>;
  const config = (program.config || {}) as Record<string, unknown>;
  const maxStamps =
    (config.maxStamps as number) ||
    ((config.tiers as { points: number }[])?.[0]?.points) ||
    10;

  const [name, setName] = useState(program.name);
  const [bgColor, setBgColor] = useState(design.bgColor || "#1a1a2e");
  const [textColor, setTextColor] = useState(design.textColor || "#ffffff");
  const [stampColor, setStampColor] = useState(
    design.stampColor || "#ffffff"
  );
  const [stampCheckColor, setStampCheckColor] = useState(
    design.stampCheckColor || design.bgColor || "#1a1a2e"
  );
  const [stampEmptyColor, setStampEmptyColor] = useState(
    design.stampEmptyColor || "#ffffff"
  );
  const [labelColor, setLabelColor] = useState(
    design.labelColor || "#a0a3aa"
  );
  const [description, setDescription] = useState(
    design.description || ""
  );
  const [logoData, setLogoData] = useState<string>(design.logoData || "");
  const [logoError, setLogoError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Avis Google
  const [reviewEnabled, setReviewEnabled] = useState(program.googleReviewEnabled);
  const [reviewBonus, setReviewBonus] = useState(program.googleReviewBonus ?? 2);
  const [reviewMinVisits, setReviewMinVisits] = useState(program.googleReviewMinVisits ?? 3);
  const [establishmentId, setEstablishmentId] = useState(program.establishmentId ?? "");
  const [establishments, setEstablishments] = useState<
    { id: string; name: string; googlePlaceId: string }[]
  >([]);
  const isPointsType = program.type === "POINTS" || program.type === "CASHBACK";

  // Charge les établissements du merchant pour le sélecteur
  useEffect(() => {
    fetch("/api/merchants/settings")
      .then((r) => r.json())
      .then((d) => setEstablishments(d.establishments ?? []))
      .catch(() => {});
  }, []);

  // Bloque scroll body + escape pour fermer
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

  function applyPreset(p: typeof CARD_PRESETS[number]) {
    setBgColor(p.bgColor);
    setTextColor(p.textColor);
    setStampColor(p.stampColor);
    setStampCheckColor(p.stampCheckColor);
    setStampEmptyColor(p.stampEmptyColor);
    setLabelColor(p.labelColor);
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLogoError("");
    const file = e.target.files?.[0];
    if (!file) return;
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
    setSuccess(false);

    const res = await fetch(`/api/programs/${program.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        cardDesign: {
          bgColor,
          textColor,
          stampColor,
          stampCheckColor,
          stampEmptyColor,
          labelColor,
          description,
          // Sur plan FREE, on n'envoie pas logoData (l'API le rejetterait
          // de toute façon, mais évite un round-trip d'erreur)
          ...(isFree ? {} : { logoData: logoData || null }),
        },
        googleReviewEnabled: reviewEnabled,
        googleReviewBonus: reviewBonus,
        googleReviewMinVisits: reviewMinVisits,
        establishmentId: establishmentId || null,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erreur lors de la modification");
      setSaving(false);
      return;
    }
    setSuccess(true);
    setSaving(false);
    setTimeout(() => onSaved(), 800);
  }

  return (
    <div
      className="recovery-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-design-title"
      onClick={onClose}
      style={{ alignItems: "flex-start", paddingTop: "5vh", paddingBottom: "5vh" }}
    >
      <div
        className="recovery-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 760, maxHeight: "90vh" }}
      >
        <header className="recovery-modal-head">
          <h2 id="edit-design-title" style={{ fontSize: 16 }}>
            <Palette
              size={15}
              style={{ display: "inline", marginRight: 8, verticalAlign: -2 }}
            />
            Modifier le design — {program.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="recovery-modal-close"
          >
            <X size={16} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="recovery-modal-body" style={{ alignItems: "stretch", gap: 18 }}>
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              Design enregistré. Les cartes Wallet existantes vont se mettre à jour automatiquement.
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-[1fr_280px]">
            {/* Left : form */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Nom du programme</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-500">Description (optionnel)</label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Le 10ᵉ café offert"
                />
              </div>

              {/* Lock notice for stamps count */}
              <div
                className="rounded-lg flex items-start gap-2 px-3 py-2 text-xs"
                style={{
                  background: "rgba(255,214,107,0.08)",
                  border: "1px solid rgba(255,214,107,0.25)",
                  color: "#ffd66b",
                }}
              >
                <Lock size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  Le nombre de tampons ({maxStamps}) et le type de programme ne sont pas modifiables — cela casserait
                  les progressions des cartes déjà émises. Pour changer ces paramètres, créez un nouveau programme.
                </span>
              </div>

              {/* Logo */}
              <div className="space-y-1">
                <label className="text-xs text-gray-500">
                  Logo (haut-gauche de la carte) — PNG/JPG, max 500 KB
                </label>
                {isFree ? (
                  <div
                    className="rounded-lg px-3 py-2 text-xs"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px dashed rgba(255,255,255,0.12)",
                      color: "#8a8e84",
                    }}
                  >
                    <Lock size={11} style={{ display: "inline", marginRight: 4, verticalAlign: -1 }} />
                    Logo personnalisé réservé aux plans payants. Passez au plan Essentiel pour débloquer.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoChange}
                      className="text-xs"
                    />
                    {logoError && (
                      <p className="text-xs text-red-500">{logoError}</p>
                    )}
                    {logoData && (
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={logoData}
                          alt="Logo preview"
                          style={{
                            height: 36,
                            maxWidth: 110,
                            objectFit: "contain",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 6,
                            padding: 4,
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setLogoData("")}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Retirer
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Presets */}
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Palette rapide</label>
                <div className="flex gap-2 flex-wrap">
                  {CARD_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p)}
                      title={p.name}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: p.bgColor,
                        border:
                          bgColor === p.bgColor
                            ? "2px solid #d4ff4e"
                            : "1px solid rgba(255,255,255,0.12)",
                        cursor: "pointer",
                      }}
                      aria-label={p.name}
                    />
                  ))}
                </div>
              </div>

              {/* Color pickers */}
              <div className="grid grid-cols-2 gap-2">
                <ColorPicker label="Fond" value={bgColor} onChange={setBgColor} />
                <ColorPicker label="Texte" value={textColor} onChange={setTextColor} />
                <ColorPicker label="Tampon" value={stampColor} onChange={setStampColor} />
                <ColorPicker label="✓ tampon" value={stampCheckColor} onChange={setStampCheckColor} />
                <ColorPicker label="Cercle vide" value={stampEmptyColor} onChange={setStampEmptyColor} />
                <ColorPicker label="Étiquettes" value={labelColor} onChange={setLabelColor} />
              </div>

              {/* Avis Google */}
              <div
                className="space-y-3 rounded-lg p-3"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={reviewEnabled}
                    onChange={(e) => setReviewEnabled(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">⭐ Récompenser un avis Google</span>
                </label>

                {reviewEnabled && (
                  <div className="space-y-3 pl-6">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">
                        Bonus par avis ({isPointsType ? "points" : "tampons"})
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={reviewBonus}
                        onChange={(e) => setReviewBonus(parseInt(e.target.value) || 1)}
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">
                        Proposer après combien de visites ?
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={reviewMinVisits}
                        onChange={(e) => setReviewMinVisits(parseInt(e.target.value) || 1)}
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">
                        Établissement (pour le lien d&apos;avis Google)
                      </label>
                      <select
                        value={establishmentId}
                        onChange={(e) => setEstablishmentId(e.target.value)}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm bg-white"
                      >
                        <option value="">— Aucun —</option>
                        {establishments.map((est) => (
                          <option key={est.id} value={est.id}>
                            {est.name} {est.googlePlaceId ? "✓ Place ID" : "⚠️ sans Place ID"}
                          </option>
                        ))}
                      </select>
                      {establishmentId &&
                        !establishments.find((e) => e.id === establishmentId)?.googlePlaceId && (
                          <p className="text-xs text-amber-600">
                            ⚠️ Cet établissement n&apos;a pas de Google Place ID. Ajoutez-le dans
                            Paramètres → établissement, sinon les avis ne fonctionneront pas.
                          </p>
                        )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right : live preview */}
            <div style={{ position: "sticky", top: 0 }}>
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider text-center">
                Aperçu live
              </p>
              <WalletCardPreview
                bgColor={bgColor}
                textColor={textColor}
                stampColor={stampColor}
                stampCheckColor={stampCheckColor}
                stampEmptyColor={stampEmptyColor}
                labelColor={labelColor}
                programName={name}
                maxStamps={maxStamps}
                logoData={logoData || undefined}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t border-white/10">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer le design"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Stamp, Award, Percent, Trash2, ExternalLink, Lock, Palette, X, Eye, Archive, ImagePlus } from "lucide-react";
import ClientPreviewModal from "@/components/dashboard/ClientPreviewModal";
import {
  getStampAreaInset,
  getStampAreaRadius,
  getStampIcon,
  getStampSpacingMult,
  STAMP_AREA_INSET_MAX,
  STAMP_AREA_RADIUS_MAX,
  STAMP_ICON_GROUPS,
  STAMP_SPACING_LIST,
} from "@/lib/wallet/stamp-icons";
import {
  DEFAULT_JOIN_FORM_REQUIREMENTS,
  getJoinFormRequirements,
  type JoinFormRequirements,
} from "@/lib/join-form";

type WalletPreviewProps = {
  bgColor: string;
  textColor: string;
  stampColor?: string;
  stampCheckColor?: string;
  stampEmptyColor?: string;
  labelColor?: string;
  programName: string;
  offerText?: string;
  maxStamps: number;
  logoData?: string;
  notificationLogoData?: string;
  merchantName?: string;
  programType?: string;
  heroImage?: string;
  samplePoints?: number;
  unlimited?: boolean;
  stampIcon?: string;
  stampSpacing?: string;
  stampAreaInset?: number;
  stampAreaRadius?: number;
  stampBgType?: "none" | "color" | "image";
  stampBgColor?: string;
  stampBgColor2?: string;
  stampBgImage?: string;
};

interface Program {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  config: Record<string, unknown>;
  cardDesign: Record<string, unknown>;
  establishmentId?: string | null;
  establishment?: { id: string; name: string } | null;
  merchant?: { name: string | null; notificationDefaultLogo?: string | null } | null;
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
      <WalletPreviewPair
        bgColor={(design.bgColor as string) || "#1a1a2e"}
        textColor={(design.textColor as string) || "#ffffff"}
        stampColor={design.stampColor as string | undefined}
        stampCheckColor={design.stampCheckColor as string | undefined}
        stampEmptyColor={design.stampEmptyColor as string | undefined}
        labelColor={design.labelColor as string | undefined}
        logoData={(design.logoData as string) || undefined}
        notificationLogoData={program.merchant?.notificationDefaultLogo || undefined}
        merchantName={program.establishment?.name || program.merchant?.name || "Votre commerce"}
        heroImage={(design.heroImage as string) || undefined}
        stampIcon={(design.stampIcon as string) || undefined}
        stampSpacing={(design.stampSpacing as string) || undefined}
        stampAreaInset={getStampAreaInset(design.stampAreaInset)}
        stampAreaRadius={getStampAreaRadius(design.stampAreaRadius)}
        stampBgType={(design.stampBgType as "none" | "color" | "image") || undefined}
        stampBgColor={design.stampBgColor as string | undefined}
        stampBgColor2={design.stampBgColor2 as string | undefined}
        stampBgImage={(design.stampBgImage as string) || undefined}
        programType={program.type}
        programName={program.name}
        offerText={program.rewards[0]?.name || "Votre dernière offre"}
        maxStamps={max}
        unlimited={
          program.type === "POINTS" && config.unlimited === true
        }
      />
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
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  // Mode veille : on grise l'action plutot que de la laisser echouer.
  const [isDormant, setIsDormant] = useState(false);

  async function fetchPrograms() {
    const res = await fetch("/api/programs");
    const data = await res.json();
    setPrograms(data);
    setLoading(false);
  }

  useEffect(() => {
    fetch("/api/merchants/plan-state")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setIsDormant(d?.state === "DORMANT"))
      .catch(() => {});
  }, []);

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
      // L'archivage se reflète directement dans l'onglet Archivés —
      // pas de popup natif (le label de la carte passe à "Archivé").
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
        <Button
          onClick={() => setShowForm(true)}
          disabled={isDormant}
          title={
            isDormant
              ? "Votre essai est terminé — réactivez votre programme pour en créer un nouveau"
              : undefined
          }
        >
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
                      Modifier le programme
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

function DesignRange({
  label,
  value,
  max,
  onChange,
  dark = false,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
  dark?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center justify-between gap-3 text-xs">
        <span className={dark ? "text-gray-400" : "text-gray-500"}>{label}</span>
        <span
          className="min-w-12 rounded-full px-2 py-0.5 text-center font-mono text-[11px]"
          style={{
            color: dark ? "#d4ff4e" : "#374151",
            background: dark ? "rgba(212,255,78,0.1)" : "#f3f4f6",
          }}
        >
          {value}px
        </span>
      </span>
      <input
        type="range"
        min={0}
        max={max}
        step={2}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full cursor-pointer accent-[#d4ff4e]"
      />
    </label>
  );
}

/* ─── Personnalisation des tampons : icône + fond ───────────
   Partagé entre le formulaire de création (thème clair) et le modal
   d'édition (thème sombre via prop `dark`). Réservé aux plans payants
   et aux programmes STAMPS. */
function StampCustomizer({
  dark = false,
  stampIcon,
  setStampIcon,
  stampSpacing,
  setStampSpacing,
  stampAreaInset,
  setStampAreaInset,
  stampAreaRadius,
  setStampAreaRadius,
  stampBgType,
  setStampBgType,
  stampBgColor,
  setStampBgColor,
  stampBgColor2,
  setStampBgColor2,
  stampBgImage,
  onStampBgImageChange,
  setStampBgImage,
  stampBgError,
}: {
  dark?: boolean;
  stampIcon: string;
  setStampIcon: (v: string) => void;
  stampSpacing: string;
  setStampSpacing: (v: string) => void;
  stampAreaInset: number;
  setStampAreaInset: (v: number) => void;
  stampAreaRadius: number;
  setStampAreaRadius: (v: number) => void;
  stampBgType: "none" | "color" | "image";
  setStampBgType: (v: "none" | "color" | "image") => void;
  stampBgColor: string;
  setStampBgColor: (v: string) => void;
  stampBgColor2: string;
  setStampBgColor2: (v: string) => void;
  stampBgImage: string;
  onStampBgImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setStampBgImage: (v: string) => void;
  stampBgError: string;
}) {
  const lbl = dark ? "text-gray-400" : "text-gray-500";
  const segActive = dark
    ? { background: "#d4ff4e", color: "#0a0d04", borderColor: "#d4ff4e" }
    : { background: "#111", color: "#fff", borderColor: "#111" };
  const segIdle = dark
    ? { background: "transparent", color: "#8a8e84", borderColor: "rgb(var(--ovr) / 0.15)" }
    : { background: "#fff", color: "#555", borderColor: "#d1d5db" };

  return (
    <div className="space-y-3">
      {/* Icône du tampon */}
      <div className="space-y-1.5">
        <label className={`text-xs ${lbl}`}>Forme du tampon obtenu</label>
        <p className={`text-[11px] ${lbl}`}>
          Choisissez un symbole qui correspond à votre activité.
        </p>
        <div className="space-y-3 pt-1">
          {STAMP_ICON_GROUPS.map((group) => (
            <div key={group.key} className="space-y-1.5">
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider ${lbl}`}
              >
                {group.label}
              </span>
              <div className="flex flex-wrap gap-2">
                {group.icons.map(({ key, def }) => {
                  const active = key === stampIcon;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStampIcon(key)}
                      title={def.label}
                      aria-label={def.label}
                      aria-pressed={active}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border transition"
                      style={
                        active
                          ? {
                              borderColor: "#d4ff4e",
                              borderWidth: 2,
                              background: dark
                                ? "rgba(212,255,78,0.12)"
                                : "#f3ffd6",
                            }
                          : {
                              borderColor: dark
                                ? "rgb(var(--ovr) / 0.15)"
                                : "#e5e7eb",
                            }
                      }
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="20"
                        height="20"
                        fill={
                          def.mode === "fill"
                            ? dark
                              ? "#f4f5f1"
                              : "#111"
                            : "none"
                        }
                        stroke={
                          def.mode === "stroke"
                            ? dark
                              ? "#f4f5f1"
                              : "#111"
                            : "none"
                        }
                        strokeWidth={def.mode === "stroke" ? 2.5 : 0}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d={def.path} />
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Espacement des tampons */}
      <div className="space-y-1.5">
        <label className={`text-xs ${lbl}`}>Espacement des tampons</label>
        <div className="flex gap-1.5">
          {STAMP_SPACING_LIST.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setStampSpacing(key)}
              className="px-3 py-1.5 text-xs font-medium rounded-md border transition"
              style={stampSpacing === key ? segActive : segIdle}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="grid gap-3 rounded-lg p-3 sm:grid-cols-2"
        style={{
          background: dark ? "rgb(var(--ovr) / 0.025)" : "#ffffff",
          border: dark
            ? "1px solid rgb(var(--ovr) / 0.08)"
            : "1px solid #e5e7eb",
        }}
      >
        <DesignRange
          label="Marge gauche / droite"
          value={stampAreaInset}
          max={STAMP_AREA_INSET_MAX}
          onChange={setStampAreaInset}
          dark={dark}
        />
        <DesignRange
          label="Arrondi des coins"
          value={stampAreaRadius}
          max={STAMP_AREA_RADIUS_MAX}
          onChange={setStampAreaRadius}
          dark={dark}
        />
      </div>

      {/* Fond derrière les ronds */}
      <div className="space-y-1.5">
        <label className={`text-xs ${lbl}`}>Fond derrière les tampons</label>
        <div className="flex gap-1.5">
          {([
            { v: "none", l: "Aucun" },
            { v: "color", l: "Couleur" },
            { v: "image", l: "Image" },
          ] as const).map(({ v, l }) => (
            <button
              key={v}
              type="button"
              onClick={() => setStampBgType(v)}
              className="px-3 py-1.5 text-xs font-medium rounded-md border transition"
              style={stampBgType === v ? segActive : segIdle}
            >
              {l}
            </button>
          ))}
        </div>

        {stampBgType === "color" && (
          <div className="flex items-center gap-3 pt-1">
            <ColorPicker label="Couleur" value={stampBgColor} onChange={setStampBgColor} />
            {stampBgColor2 ? (
              <>
                <ColorPicker label="Dégradé vers" value={stampBgColor2} onChange={setStampBgColor2} />
                <button
                  type="button"
                  onClick={() => setStampBgColor2("")}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Retirer dégradé
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setStampBgColor2("#000000")}
                className="text-xs font-medium"
                style={{ color: "#d4ff4e" }}
              >
                + Ajouter un dégradé
              </button>
            )}
          </div>
        )}

        {stampBgType === "image" && (
          <div className="pt-1">
            {stampBgImage ? (
              <div
                className="flex items-center gap-3 rounded-lg p-2.5"
                style={{
                  background: dark ? "rgb(var(--ovr) / 0.04)" : "#f9fafb",
                  border: dark ? "1px solid rgb(var(--ovr) / 0.12)" : "1px solid #e5e7eb",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={stampBgImage}
                  alt="Fond tampons"
                  className="h-12 w-20 rounded object-cover border"
                />
                <span className={`flex-1 text-xs ${lbl}`}>
                  Image affichée en fond de la zone des tampons.
                </span>
                <button
                  type="button"
                  onClick={() => setStampBgImage("")}
                  className="text-xs flex items-center gap-1 hover:opacity-80"
                  style={{ color: "#ff7a6b" }}
                >
                  <X size={11} /> Retirer
                </button>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={onStampBgImageChange}
                  className="sr-only"
                />
                <div
                  className="flex items-center gap-3 rounded-lg transition-colors"
                  style={{ padding: "12px 14px", background: "#0a0d04", border: "2px dashed #d4ff4e" }}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ background: "rgba(212,255,78,0.18)", color: "#d4ff4e" }}
                  >
                    <ImagePlus size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium" style={{ color: "#f4f5f1" }}>
                      Ajouter une image de fond
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: "#8a8e84" }}>
                      PNG, JPG ou WebP · max 5 MB
                    </div>
                  </div>
                </div>
              </label>
            )}
          </div>
        )}
        {stampBgError && <p className="text-xs text-red-500">{stampBgError}</p>}
      </div>
    </div>
  );
}

/* ─── Aperçu live de la carte Apple Wallet (utilisé dans le formulaire) ─ */
function WalletPreviewPair(props: WalletPreviewProps) {
  const [selectedWallet, setSelectedWallet] = useState<"apple" | "google">("apple");

  return (
    <div className="wallet-preview-pair">
      <div className="wallet-preview-switch" aria-label="Choisir le type d'aperçu Wallet">
        <button
          type="button"
          className={selectedWallet === "apple" ? "is-active" : undefined}
          onClick={() => setSelectedWallet("apple")}
        >
          Apple Wallet
        </button>
        <button
          type="button"
          className={selectedWallet === "google" ? "is-active" : undefined}
          onClick={() => setSelectedWallet("google")}
        >
          Google Wallet
        </button>
      </div>

      {selectedWallet === "apple" ? (
        <WalletCardPreview {...props} />
      ) : (
        <GoogleWalletPreview {...props} />
      )}
    </div>
  );
}

function WalletCardPreview({
  bgColor,
  textColor,
  stampColor,
  stampCheckColor,
  stampEmptyColor,
  labelColor,
  programName,
  offerText = "Votre dernière offre",
  maxStamps,
  logoData,
  programType = "STAMPS",
  heroImage,
  samplePoints,
  unlimited = false,
  stampIcon = "check",
  stampSpacing = "normal",
  stampAreaInset = 0,
  stampAreaRadius = 0,
  stampBgType = "none",
  stampBgColor,
  stampBgColor2,
  stampBgImage,
}: WalletPreviewProps) {
  const total = Math.max(1, Math.min(20, maxStamps || 10));
  const rows = total <= 5 ? 1 : 2;
  const perRow = Math.ceil(total / rows);
  const isDarkBg = isDark(bgColor);

  // Defaults intelligents
  const sFill = stampColor || (isDarkBg ? "#ffffff" : "#0a0a0a");
  const sCheck = stampCheckColor || bgColor;
  const sEmpty = stampEmptyColor || sFill;
  const lblColor = labelColor || (isDarkBg ? "rgb(var(--ovr) / 0.65)" : "rgba(0,0,0,0.6)");

  // Aperçu proche d'Apple Wallet : un tampon rempli, le reste en anneaux.
  const sampleFilled = Math.min(1, total);

  // Icône du tampon obtenu (depuis le module partagé)
  const iconDef = getStampIcon(stampIcon);
  // Espacement : gap CSS dérivé du multiplicateur (gap de base = 8px)
  const stampGap = 8 * getStampSpacingMult(stampSpacing);

  // Fond derrière les ronds (couleur / dégradé / image)
  const stampBg: string | undefined =
    stampBgType === "image" && stampBgImage
      ? undefined // l'image est rendue via <img> en absolute
      : stampBgType === "color" && stampBgColor
        ? stampBgColor2
          ? `linear-gradient(135deg, ${stampBgColor}, ${stampBgColor2})`
          : stampBgColor
        : undefined;

  return (
    <div className="wcp" style={{ background: bgColor, color: textColor }}>
      {/* Header : logo top-left, PROGRAMME top-right */}
      <div className="wcp-head">
        {logoData ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoData} alt="Logo" className="wcp-logo" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={isDarkBg ? "/powered_by_fidlify_white.png" : "/powered_by_fidlify_black.svg"}
            alt="Powered by Fidlify"
            className="wcp-logo"
          />
        )}
        <div className="wcp-offer">
          <span className="wcp-header-label" style={{ color: lblColor }}>
            PROGRAMME
          </span>
          <span className="wcp-header-value">{programName || "—"}</span>
        </div>
      </div>

      {/* Strip : hero image pour POINTS, sinon pastilles tampons */}
      {programType === "POINTS" ? (
        heroImage ? (
          <div
            className="wcp-stamps"
            style={{
              padding: 0,
              display: "block",
              height: 120,
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
        ) : (
          <div
            className="wcp-stamps"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 120,
              border: `2px dashed ${lblColor}`,
              borderRadius: 6,
            }}
          >
            <span style={{ fontSize: 11, opacity: 0.65, color: lblColor }}>
              IMAGE DE LA CARTE (à uploader)
            </span>
          </div>
        )
      ) : (
        <div
          className="wcp-stamps"
          style={{
            gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))`,
            gap: stampGap,
            position: "relative",
            background: stampBg,
            marginLeft: -18 + getStampAreaInset(stampAreaInset),
            marginRight: -18 + getStampAreaInset(stampAreaInset),
            borderRadius: getStampAreaRadius(stampAreaRadius),
            overflow: "hidden",
          }}
        >
          {stampBgType === "image" && stampBgImage && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={stampBgImage}
                alt=""
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  zIndex: 0,
                }}
              />
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.18)",
                  zIndex: 0,
                }}
              />
            </>
          )}
          {Array.from({ length: total }).map((_, i) => {
            const filled = i < sampleFilled;
            return (
              <span
                key={i}
                className="wcp-stamp"
                style={{
                  position: "relative",
                  zIndex: 1,
                  borderColor: filled ? sFill : sEmpty,
                  background: filled ? sFill : "transparent",
                  color: sCheck,
                }}
              >
                {filled && (
                  <svg
                    viewBox="0 0 24 24"
                    width="60%"
                    height="60%"
                    fill={iconDef.mode === "fill" ? "currentColor" : "none"}
                    stroke={iconDef.mode === "stroke" ? "currentColor" : "none"}
                    strokeWidth={iconDef.mode === "stroke" ? 3.5 : 0}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={iconDef.path} />
                  </svg>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* Secondary fields */}
      <div className="wcp-fields">
        <div className="wcp-field">
          <span className="wcp-label" style={{ color: lblColor }}>
            {programType === "POINTS" ? "POINTS" : "TAMPONS REQUIS"}
          </span>
          <span className="wcp-value">
            {programType === "POINTS"
              ? unlimited
                ? `${samplePoints ?? 0} pts`
                : `${samplePoints ?? 0} / ${maxStamps}`
              : maxStamps}
          </span>
        </div>
        <div className="wcp-field wcp-field-offer" style={{ textAlign: "right" }}>
          <span className="wcp-label" style={{ color: lblColor }}>
            OFFRE
          </span>
          <span className="wcp-value">{offerText}</span>
        </div>
      </div>

      {/* Mock QR */}
      <div className="wcp-qr-wrap">
        <span className="wcp-qr" />
      </div>
    </div>
  );
}

function GoogleWalletPreview({
  bgColor,
  textColor,
  stampColor,
  stampCheckColor,
  stampEmptyColor,
  labelColor,
  programName,
  merchantName,
  maxStamps,
  programType = "STAMPS",
  logoData,
  notificationLogoData,
  heroImage,
  samplePoints,
  stampAreaInset = 0,
  stampAreaRadius = 0,
  stampIcon = "check",
  stampSpacing = "normal",
  stampBgType = "none",
  stampBgColor,
  stampBgColor2,
  stampBgImage,
}: WalletPreviewProps) {
  const isDarkBg = isDark(bgColor);
  const lblColor = labelColor || (isDarkBg ? "rgb(var(--ovr) / 0.82)" : "rgba(0,0,0,0.68)");
  const mediaImage = stampBgType === "image" && stampBgImage ? stampBgImage : heroImage;
  const googleLogoData = notificationLogoData || logoData;
  const total = Math.max(1, Math.min(20, maxStamps || 10));
  const sampleFilled = programType === "STAMPS" ? Math.min(1, total) : 0;
  const rows = total <= 5 ? 1 : 2;
  const perRow = Math.ceil(total / rows);
  const iconDef = getStampIcon(stampIcon);
  const stampGap = Math.max(5, 7 * getStampSpacingMult(stampSpacing));
  const sFill = stampColor || (isDarkBg ? "#ffffff" : "#0a0a0a");
  const sCheck = stampCheckColor || bgColor;
  const sEmpty = stampEmptyColor || sFill;
  const stripBackground =
    stampBgType === "color" && stampBgColor
      ? stampBgColor2
        ? `linear-gradient(135deg, ${stampBgColor}, ${stampBgColor2})`
        : stampBgColor
      : undefined;
  const metricLabel =
    programType === "POINTS" ? "Points" : programType === "CASHBACK" ? "Cashback" : "Tampons requis";
  const metricValue =
    programType === "POINTS"
      ? String(samplePoints ?? 0)
      : programType === "CASHBACK"
        ? "CHF 0"
        : `${total}`;

  return (
    <div className="gwp" style={{ background: bgColor, color: textColor }}>
      <div className="gwp-head">
        <span className="gwp-logo-badge">
          {googleLogoData ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={googleLogoData} alt="" className="gwp-logo" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={isDarkBg ? "/powered_by_fidlify_white.png" : "/powered_by_fidlify_black.svg"}
              alt=""
              className="gwp-logo gwp-logo-powered"
            />
          )}
        </span>
        <span className="gwp-merchant">{merchantName || "Votre commerce"}</span>
      </div>

      <div className="gwp-main">
        <h3 className="gwp-title">{programName || "Mon programme"}</h3>
        <div className="gwp-metric">
          <span style={{ color: lblColor }}>{metricLabel}</span>
          <strong>{metricValue}</strong>
        </div>
      </div>

      <div className="gwp-qr-zone">
        <div className="gwp-qr-card">
          <span className="gwp-qr" />
        </div>
        <span className="gwp-code">IIHL-KHOC-SC2F</span>
      </div>

      <div
        className="gwp-strip"
        style={{
          marginLeft: getStampAreaInset(stampAreaInset),
          marginRight: getStampAreaInset(stampAreaInset),
          borderRadius: getStampAreaRadius(stampAreaRadius),
          background: stripBackground,
        }}
      >
        {programType === "STAMPS" ? (
          <>
            {mediaImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaImage} alt="" className="gwp-strip-img" />
            ) : (
              <div className="gwp-strip-empty" />
            )}
            <div
              className="gwp-stamps"
              style={{
                gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))`,
                gap: stampGap,
              }}
            >
              {Array.from({ length: total }).map((_, i) => {
                const filled = i < sampleFilled;
                return (
                  <span
                    key={i}
                    className="gwp-stamp"
                    style={{
                      borderColor: filled ? sFill : sEmpty,
                      background: filled ? sFill : "rgb(var(--ovr) / 0.08)",
                      color: sCheck,
                    }}
                  >
                    {filled && (
                      <svg
                        viewBox="0 0 24 24"
                        width="58%"
                        height="58%"
                        fill={iconDef.mode === "fill" ? "currentColor" : "none"}
                        stroke={iconDef.mode === "stroke" ? "currentColor" : "none"}
                        strokeWidth={iconDef.mode === "stroke" ? 3.2 : 0}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d={iconDef.path} />
                      </svg>
                    )}
                  </span>
                );
              })}
            </div>
          </>
        ) : mediaImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaImage} alt="" className="gwp-strip-img" />
        ) : (
          <div className="gwp-strip-empty" />
        )}
      </div>
    </div>
  );
}

function JoinFormRequirementsEditor({
  value,
  onChange,
  dark = false,
}: {
  value: JoinFormRequirements;
  onChange: (value: JoinFormRequirements) => void;
  dark?: boolean;
}) {
  const options: Array<{
    key: keyof JoinFormRequirements;
    label: string;
    description: string;
  }> = [
    {
      key: "emailRequired",
      label: "Email obligatoire",
      description: "Utile pour récupérer une carte et contacter le client.",
    },
    {
      key: "phoneRequired",
      label: "Téléphone obligatoire",
      description: "Demande systématiquement un numéro au client.",
    },
    {
      key: "birthDateRequired",
      label: "Date de naissance obligatoire",
      description: "Permet d'activer les campagnes d'anniversaire pour tous.",
    },
  ];

  return (
    <section
      className={dark
        ? "space-y-3 border-t border-white/10 pt-4"
        : "space-y-3 border-t border-gray-200 pt-4"}
    >
      <div>
        <h3 className={dark
          ? "text-sm font-semibold text-white"
          : "text-sm font-semibold text-gray-900"}>
          Formulaire d&apos;inscription client
        </h3>
        <p className={dark
          ? "mt-1 text-xs text-gray-400"
          : "mt-1 text-xs text-gray-500"}>
          Le prénom est toujours requis. Choisissez les autres informations que
          le client doit obligatoirement renseigner après avoir scanné le QR code.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map((option) => (
          <label
            key={option.key}
            className={dark
              ? "flex cursor-pointer items-start gap-2 border-l-2 border-white/15 py-1 pl-3"
              : "flex cursor-pointer items-start gap-2 border-l-2 border-gray-200 py-1 pl-3"}
          >
            <input
              type="checkbox"
              checked={value[option.key]}
              onChange={(event) =>
                onChange({ ...value, [option.key]: event.target.checked })
              }
              className="mt-0.5 h-4 w-4 accent-[#a8d51b]"
            />
            <span>
              <span className={dark
                ? "block text-xs font-semibold text-white"
                : "block text-xs font-semibold text-gray-900"}>
                {option.label}
              </span>
              <span className={dark
                ? "mt-0.5 block text-[11px] leading-4 text-gray-400"
                : "mt-0.5 block text-[11px] leading-4 text-gray-500"}>
                {option.description}
              </span>
            </span>
          </label>
        ))}
      </div>
      {!value.emailRequired && !value.phoneRequired && (
        <p className={dark
          ? "text-[11px] text-gray-400"
          : "text-[11px] text-gray-500"}>
          Email et téléphone sont optionnels individuellement, mais le client
          devra renseigner au moins l&apos;un des deux.
        </p>
      )}
    </section>
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
  const [pointsUnlimited, setPointsUnlimited] = useState(false);
  const [rewardName, setRewardName] = useState("");
  const [bgColor, setBgColor] = useState("#1a1a2e");
  const [textColor, setTextColor] = useState("#ffffff");
  const [stampColor, setStampColor] = useState("#ffffff"); // fill des cercles tampons obtenus
  const [stampCheckColor, setStampCheckColor] = useState("#1a1a2e"); // ✓ à l'intérieur
  const [stampEmptyColor, setStampEmptyColor] = useState("#ffffff"); // outline cercles vides
  const [labelColor, setLabelColor] = useState("#a0a3aa"); // texte OFFRE / TAMPONS REQUIS
  const [logoData, setLogoData] = useState<string>("");
  const [logoError, setLogoError] = useState<string>("");
  const [heroImage, setHeroImage] = useState<string>("");
  const [heroError, setHeroError] = useState<string>("");
  // Personnalisation des tampons (plans payants)
  const [stampIcon, setStampIcon] = useState<string>("check");
  const [stampSpacing, setStampSpacing] = useState<string>("normal");
  const [stampAreaInset, setStampAreaInset] = useState(0);
  const [stampAreaRadius, setStampAreaRadius] = useState(0);
  const [stampBgType, setStampBgType] = useState<"none" | "color" | "image">("none");
  const [stampBgColor, setStampBgColor] = useState("#1a1a2e");
  const [stampBgColor2, setStampBgColor2] = useState("");
  const [stampBgImage, setStampBgImage] = useState<string>("");
  const [stampBgError, setStampBgError] = useState<string>("");
  const [establishmentId, setEstablishmentId] = useState("");
  const [establishments, setEstablishments] = useState<
    { id: string; name: string; latitude: number | null; longitude: number | null }[]
  >([]);
  const [notificationLogoData, setNotificationLogoData] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [joinForm, setJoinForm] = useState<JoinFormRequirements>({
    ...DEFAULT_JOIN_FORM_REQUIREMENTS,
  });
  const selectedEstablishmentName = establishments.find((est) => est.id === establishmentId)?.name;
  const merchantDisplayName =
    selectedEstablishmentName ||
    (session?.user as { name?: string | null } | undefined)?.name ||
    "Votre commerce";

  useEffect(() => {
    fetch("/api/merchants/settings")
      .then((r) => r.json())
      .then((d) => {
        setEstablishments(d.establishments ?? []);
        setNotificationLogoData(
          typeof d.notificationDefaultLogo === "string" ? d.notificationDefaultLogo : ""
        );
      })
      .catch(() => {});
  }, []);

  // `.dx-content` utilise overflow-y:auto sans être le conteneur qui défile :
  // cela empêche position:sticky de suivre le viewport. Pendant l'édition
  // seulement, on laisse le document gérer le scroll. Le sticky reste alors
  // naturellement borné par la grille de la carte "Nouveau programme".
  useEffect(() => {
    const dashboardContent =
      document.querySelector<HTMLElement>(".dx-content");
    if (!dashboardContent) return;

    const previousOverflowY = dashboardContent.style.overflowY;
    dashboardContent.style.overflowY = "visible";

    return () => {
      dashboardContent.style.overflowY = previousOverflowY;
    };
  }, []);

  function handleStampBgImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    setStampBgError("");
    const file = e.target.files?.[0];
    if (!file) {
      setStampBgImage("");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setStampBgError("Le fichier doit être une image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setStampBgError("Image trop lourde (max 5 MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setStampBgImage(reader.result as string);
    reader.onerror = () => setStampBgError("Erreur de lecture du fichier");
    reader.readAsDataURL(file);
  }

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
    if (file.size > 5 * 1024 * 1024) {
      setLogoError("Image trop lourde (max 5 MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoData(reader.result as string);
    reader.onerror = () => setLogoError("Erreur de lecture du fichier");
    reader.readAsDataURL(file);
  }

  function handleHeroChange(e: React.ChangeEvent<HTMLInputElement>) {
    setHeroError("");
    const file = e.target.files?.[0];
    if (!file) {
      setHeroImage("");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setHeroError("Le fichier doit être une image");
      return;
    }
    // Hero image plus grande que le logo (affichée sur toute la largeur du strip)
    if (file.size > 5 * 1024 * 1024) {
      setHeroError("Image trop lourde (max 5 MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setHeroImage(reader.result as string);
    reader.onerror = () => setHeroError("Erreur de lecture du fichier");
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const baseConfig =
      type === "STAMPS"
        ? { maxStamps, reward: rewardName }
        : type === "POINTS"
          ? pointsUnlimited
            ? { pointsPerChf: 1, unlimited: true }
            : { pointsPerChf: 1, tiers: [{ points: maxStamps, reward: rewardName }] }
          : { percentage: 5, minSpend: 10 }; // CASHBACK
    const config = { ...baseConfig, joinForm };

    const res = await fetch("/api/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type,
        establishmentId: establishmentId || null,
        config,
        cardDesign: {
          bgColor,
          textColor,
          stampColor,
          stampCheckColor,
          stampEmptyColor,
          labelColor,
          logoData: logoData || undefined,
          // heroImage uniquement utile pour POINTS (remplace le strip à pastilles)
          heroImage: type === "POINTS" && heroImage ? heroImage : undefined,
          // Personnalisation tampons (STAMPS) — réservé aux plans payants
          ...(type === "STAMPS" && !isFree
            ? {
                stampIcon,
                stampSpacing,
                stampAreaInset,
                stampAreaRadius,
                stampBgType,
                stampBgColor: stampBgType === "color" ? stampBgColor : undefined,
                stampBgColor2:
                  stampBgType === "color" && stampBgColor2
                    ? stampBgColor2
                    : undefined,
                stampBgImage:
                  stampBgType === "image" && stampBgImage
                    ? stampBgImage
                    : undefined,
              }
            : {}),
          description: `Programme ${name}`,
        },
        rewards:
          rewardName && !(type === "POINTS" && pointsUnlimited)
            ? [
                {
                  name: rewardName,
                  threshold: maxStamps,
                  rewardType: "FREE_ITEM",
                },
              ]
            : [],
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

  const livePreview = (
    <WalletPreviewPair
      bgColor={bgColor}
      textColor={textColor}
      stampColor={stampColor}
      stampCheckColor={stampCheckColor}
      stampEmptyColor={stampEmptyColor}
      labelColor={labelColor}
      programName={name || "Mon programme"}
      offerText={rewardName || "Votre dernière offre"}
      merchantName={merchantDisplayName}
      maxStamps={maxStamps}
      logoData={logoData}
      notificationLogoData={notificationLogoData || undefined}
      programType={type}
      heroImage={heroImage}
      stampIcon={stampIcon}
      stampSpacing={stampSpacing}
      stampAreaInset={stampAreaInset}
      stampAreaRadius={stampAreaRadius}
      stampBgType={type === "STAMPS" && !isFree ? stampBgType : "none"}
      stampBgColor={stampBgColor}
      stampBgColor2={stampBgColor2 || undefined}
      stampBgImage={stampBgImage || undefined}
      unlimited={type === "POINTS" && pointsUnlimited}
      samplePoints={
        type === "POINTS"
          ? pointsUnlimited
            ? 123
            : Math.floor(maxStamps * 0.3)
          : undefined
      }
    />
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveau programme</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 whitespace-pre-line">
              {error}
            </div>
          )}

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
            <div className="min-w-0 space-y-4">
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
              </select>
              {isFree && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Plan Gratuit : tampons uniquement. Essentiel débloque points et cashback.
                </p>
              )}
            </div>

            {type === "STAMPS" && (
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
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={pointsUnlimited}
                    onChange={(e) => setPointsUnlimited(e.target.checked)}
                    className="rounded"
                  />
                  <span className="font-medium">
                    Points cumulables à l&apos;infini (pas de seuil)
                  </span>
                </label>
                {!pointsUnlimited && (
                  <>
                    <label className="text-sm font-medium block">
                      Points nécessaires pour la récompense
                    </label>
                    <Input
                      type="number"
                      min={10}
                      max={10000}
                      value={maxStamps}
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        if (Number.isNaN(v)) return;
                        setMaxStamps(Math.max(10, Math.min(10000, v)));
                      }}
                    />
                    <p className="text-xs text-gray-400">
                      Entre 10 et 10&apos;000 points.
                    </p>
                  </>
                )}
                {pointsUnlimited && (
                  <p className="text-xs text-gray-500">
                    Les clients accumulent des points sans plafond. Aucune
                    récompense n&apos;est déclenchée automatiquement — gérez les
                    récompenses manuellement depuis les fiches clients.
                  </p>
                )}
              </div>
            )}

            {!(type === "POINTS" && pointsUnlimited) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Récompense</label>
                <Input
                  placeholder="1 café offert"
                  value={rewardName}
                  onChange={(e) => setRewardName(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">
                Établissement associé
              </label>
              <select
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={establishmentId}
                onChange={(e) => setEstablishmentId(e.target.value)}
              >
                <option value="">Aucun établissement pour le moment</option>
                {establishments.map((est) => (
                  <option key={est.id} value={est.id}>
                    {est.name}
                    {est.latitude !== null && est.longitude !== null
                      ? " · position Wallet active"
                      : " · position à définir"}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400">
                Version initiale : un programme utilise un seul établissement.
                Si sa position Wallet est renseignée, Apple et Google peuvent
                afficher la carte quand le client est proche.
              </p>
            </div>
              </div>

              <JoinFormRequirementsEditor
                value={joinForm}
                onChange={setJoinForm}
              />

              {/* Card Design */}
              <div className="space-y-4">
            <label className="text-sm font-medium">Design de la carte</label>

            {/* Logo upload */}
            <div className="space-y-2">
              <label className="text-xs text-gray-500">Logo de la carte (optionnel)</label>
              {isFree ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-400">
                  Logo personnalisé non disponible sur le plan Gratuit — le logo Fidlify est affiché à la place.
                </div>
              ) : logoData ? (
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoData}
                    alt="Logo"
                    className="h-14 w-14 rounded-lg object-contain border bg-white"
                    style={{ background: bgColor }}
                  />
                  <div className="flex-1 text-xs text-gray-600">
                    Logo ajouté. Visible en haut-gauche de la carte Wallet.
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setLogoData("")}>
                    <X className="h-3.5 w-3.5 mr-1" /> Retirer
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleLogoChange}
                    className="sr-only"
                  />
                  <div
                    className="flex items-center gap-3 rounded-lg transition-colors"
                    style={{
                      padding: "16px 18px",
                      background: "#0a0d04",
                      border: "2px dashed #d4ff4e",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#15170d";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#0a0d04";
                    }}
                  >
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                      style={{ background: "rgba(212,255,78,0.18)", color: "#d4ff4e" }}
                    >
                      <ImagePlus className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium" style={{ color: "#f4f5f1" }}>
                        Ajouter un logo personnalisé
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "#8a8e84" }}>
                        PNG, JPG, SVG ou WebP · max 5 MB · affiché en haut-gauche de la carte Wallet
                      </div>
                    </div>
                    <div
                      className="hidden sm:block text-xs font-medium whitespace-nowrap"
                      style={{ color: "#d4ff4e" }}
                    >
                      Choisir un fichier →
                    </div>
                  </div>
                </label>
              )}
              {logoError && <p className="text-xs text-red-500">{logoError}</p>}
            </div>

            {/* Hero image — uniquement pour POINTS et plan payant */}
            {type === "POINTS" && !isFree && (
              <div className="space-y-2">
                <label className="text-xs text-gray-500">
                  Image de la carte (remplace la zone des tampons)
                </label>
                {heroImage ? (
                  <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={heroImage}
                      alt="Hero"
                      className="h-16 w-24 rounded object-cover border bg-white"
                    />
                    <div className="flex-1 text-xs text-gray-600">
                      Image ajoutée. Affichée au centre de la carte avec le nombre de points au-dessus.
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setHeroImage("")}>
                      <X className="h-3.5 w-3.5 mr-1" /> Retirer
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleHeroChange}
                      className="sr-only"
                    />
                    <div
                      className="flex items-center gap-3 rounded-lg transition-colors"
                      style={{
                        padding: "16px 18px",
                        background: "#0a0d04",
                        border: "2px dashed #d4ff4e",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#15170d";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#0a0d04";
                      }}
                    >
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                        style={{ background: "rgba(212,255,78,0.18)", color: "#d4ff4e" }}
                      >
                        <ImagePlus className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium" style={{ color: "#f4f5f1" }}>
                          Ajouter l&apos;image de la carte
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "#8a8e84" }}>
                          PNG, JPG ou WebP · max 5 MB · ratio paysage recommandé (ex. 1125×432)
                        </div>
                      </div>
                      <div
                        className="hidden sm:block text-xs font-medium whitespace-nowrap"
                        style={{ color: "#d4ff4e" }}
                      >
                        Choisir un fichier →
                      </div>
                    </div>
                  </label>
                )}
                {heroError && <p className="text-xs text-red-500">{heroError}</p>}
              </div>
            )}

            {/* Personnalisation des tampons — STAMPS + plan payant */}
            {type === "STAMPS" && !isFree && (
              <div
                className="space-y-2 rounded-lg border border-gray-200 p-3"
                style={{ background: "#fafafa" }}
              >
                <label className="text-xs font-medium text-gray-600">
                  Tampons personnalisés
                </label>
                <StampCustomizer
                  stampIcon={stampIcon}
                  setStampIcon={setStampIcon}
                  stampSpacing={stampSpacing}
                  setStampSpacing={setStampSpacing}
                  stampAreaInset={stampAreaInset}
                  setStampAreaInset={setStampAreaInset}
                  stampAreaRadius={stampAreaRadius}
                  setStampAreaRadius={setStampAreaRadius}
                  stampBgType={stampBgType}
                  setStampBgType={setStampBgType}
                  stampBgColor={stampBgColor}
                  setStampBgColor={setStampBgColor}
                  stampBgColor2={stampBgColor2}
                  setStampBgColor2={setStampBgColor2}
                  stampBgImage={stampBgImage}
                  onStampBgImageChange={handleStampBgImageChange}
                  setStampBgImage={setStampBgImage}
                  stampBgError={stampBgError}
                />
              </div>
            )}

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

            {/* Couleurs personnalisées */}
            <div className="grid grid-cols-2 gap-3 content-start sm:grid-cols-3">
              <ColorPicker label="Fond"          value={bgColor}          onChange={setBgColor} />
              <ColorPicker label="Texte"         value={textColor}        onChange={setTextColor} />
              <ColorPicker label="Tampon ✓"      value={stampColor}       onChange={setStampColor} />
              <ColorPicker label="Coche du ✓"    value={stampCheckColor}  onChange={setStampCheckColor} />
              <ColorPicker label="Cercle vide"   value={stampEmptyColor}  onChange={setStampEmptyColor} />
              <ColorPicker label="Labels"        value={labelColor}       onChange={setLabelColor} />
              </div>
            </div>
            </div>

            <aside
              className="sticky top-24 hidden max-h-[calc(100vh-7rem)] self-start overflow-y-auto xl:block"
              aria-label="Aperçu de la carte"
            >
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-xl">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Aperçu en direct
                    </p>
                    <p className="text-xs text-gray-500">
                      Reste visible pendant vos modifications
                    </p>
                  </div>
                  <Eye className="h-4 w-4 text-gray-400" />
                </div>
                <div className="flex justify-center">{livePreview}</div>
              </div>
            </aside>
          </div>

          <button
            type="button"
            onClick={() => setShowMobilePreview(true)}
            className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-gray-950 px-4 py-3 text-sm font-semibold text-white shadow-2xl transition hover:-translate-y-0.5 hover:bg-black xl:hidden"
          >
            <Eye className="h-4 w-4" />
            Voir l&apos;aperçu
          </button>

          {showMobilePreview && (
            <div
              className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/65 p-4 backdrop-blur-sm xl:hidden"
              onClick={() => setShowMobilePreview(false)}
            >
              <div
                className="my-auto w-full max-w-[420px] rounded-2xl bg-white p-4 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Aperçu en direct
                    </p>
                    <p className="text-xs text-gray-500">
                      Chaque modification est appliquée instantanément
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMobilePreview(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                    aria-label="Fermer l'aperçu"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex justify-center">{livePreview}</div>
              </div>
            </div>
          )}

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
  const initialMaxStamps =
    (config.maxStamps as number) ||
    ((config.tiers as { points: number }[])?.[0]?.points) ||
    10;

  const [name, setName] = useState(program.name);
  const [maxStamps, setMaxStamps] = useState(initialMaxStamps);
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
  const [heroImage, setHeroImage] = useState<string>(design.heroImage || "");
  const [heroError, setHeroError] = useState("");
  // Personnalisation tampons
  const [stampIcon, setStampIcon] = useState<string>(design.stampIcon || "check");
  const [stampSpacing, setStampSpacing] = useState<string>(design.stampSpacing || "normal");
  const [stampAreaInset, setStampAreaInset] = useState(
    getStampAreaInset(design.stampAreaInset)
  );
  const [stampAreaRadius, setStampAreaRadius] = useState(
    getStampAreaRadius(design.stampAreaRadius)
  );
  const [stampBgType, setStampBgType] = useState<"none" | "color" | "image">(
    (design.stampBgType as "none" | "color" | "image") || "none"
  );
  const [stampBgColor, setStampBgColor] = useState<string>(
    design.stampBgColor || "#1a1a2e"
  );
  const [stampBgColor2, setStampBgColor2] = useState<string>(
    design.stampBgColor2 || ""
  );
  const [stampBgImage, setStampBgImage] = useState<string>(design.stampBgImage || "");
  const [stampBgError, setStampBgError] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [joinForm, setJoinForm] = useState<JoinFormRequirements>(() =>
    getJoinFormRequirements(program.config)
  );

  function handleStampBgImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    setStampBgError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStampBgError("Le fichier doit être une image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setStampBgError("Image trop lourde (max 5 MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setStampBgImage(reader.result as string);
    reader.onerror = () => setStampBgError("Erreur de lecture du fichier");
    reader.readAsDataURL(file);
  }
  const [establishmentId, setEstablishmentId] = useState(program.establishmentId ?? "");
  const [establishments, setEstablishments] = useState<
    { id: string; name: string }[]
  >([]);
  const [notificationLogoData, setNotificationLogoData] = useState(
    program.merchant?.notificationDefaultLogo || ""
  );

  // Charge les établissements du merchant pour le sélecteur
  useEffect(() => {
    fetch("/api/merchants/settings")
      .then((r) => r.json())
      .then((d) => {
        setEstablishments(d.establishments ?? []);
        setNotificationLogoData(
          typeof d.notificationDefaultLogo === "string" ? d.notificationDefaultLogo : ""
        );
      })
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
    if (file.size > 5 * 1024 * 1024) {
      setLogoError("Image trop lourde (max 5 MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoData(reader.result as string);
    reader.onerror = () => setLogoError("Erreur de lecture du fichier");
    reader.readAsDataURL(file);
  }

  function handleHeroChange(e: React.ChangeEvent<HTMLInputElement>) {
    setHeroError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setHeroError("Le fichier doit être une image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setHeroError("Image trop lourde (max 5 MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setHeroImage(reader.result as string);
    reader.onerror = () => setHeroError("Erreur de lecture du fichier");
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
        ...(program.type === "STAMPS" ? { maxStamps } : {}),
        cardDesign: {
          bgColor,
          textColor,
          stampColor,
          stampCheckColor,
          stampEmptyColor,
          labelColor,
          description,
          // Sur plan FREE, on n'envoie pas logoData ni heroImage (réservés payants)
          ...(isFree ? {} : { logoData: logoData || null }),
          // heroImage : uniquement pertinent pour POINTS
          ...(isFree || program.type !== "POINTS"
            ? {}
            : { heroImage: heroImage || null }),
          // Personnalisation tampons : STAMPS + plan payant.
          ...(isFree || program.type !== "STAMPS"
            ? {}
            : {
                stampIcon,
                stampSpacing,
                stampAreaInset,
                stampAreaRadius,
                stampBgType,
                stampBgColor: stampBgType === "color" ? stampBgColor : null,
                stampBgColor2:
                  stampBgType === "color" && stampBgColor2 ? stampBgColor2 : null,
                stampBgImage:
                  stampBgType === "image" && stampBgImage ? stampBgImage : null,
              }),
        },
        establishmentId: establishmentId || null,
        joinForm,
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
        className="recovery-modal program-edit-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 760, maxHeight: "90vh" }}
      >
        <header className="recovery-modal-head">
          <h2 id="edit-design-title" style={{ fontSize: 16 }}>
            <Palette
              size={15}
              style={{ display: "inline", marginRight: 8, verticalAlign: -2 }}
            />
            Modifier le programme - {program.name}
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
              Programme enregistré. Les cartes Wallet existantes vont se mettre à jour automatiquement.
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
                  placeholder="Ex : Le 10e café offert"
                />
              </div>

              {program.type === "STAMPS" && (
                <div className="space-y-1">
                  <label htmlFor="edit-max-stamps" className="text-xs text-gray-500">
                    Tampons requis
                  </label>
                  <Input
                    id="edit-max-stamps"
                    type="number"
                    min={1}
                    max={20}
                    step={1}
                    value={maxStamps}
                    onChange={(e) => setMaxStamps(Number(e.target.value))}
                    required
                  />
                  <p className="program-edit-help">
                    Entre 1 et 20. Les tampons déjà acquis par les clients sont conservés.
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs text-gray-500">
                  Établissement associé
                </label>
                <select
                  value={establishmentId}
                  onChange={(e) => setEstablishmentId(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-2 py-2 text-sm"
                >
                  <option value="">Aucun établissement</option>
                  {establishments.map((est) => (
                    <option key={est.id} value={est.id}>
                      {est.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400">
                  Utilisé pour le nom du point de vente et la position Wallet.
                </p>
              </div>

              <JoinFormRequirementsEditor
                value={joinForm}
                onChange={setJoinForm}
                dark
              />

              {/* Program type remains immutable; client progress is preserved. */}
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
                  Le type de programme n&apos;est pas modifiable. Le nombre de tampons
                  requis peut évoluer sans remettre à zéro les cartes déjà émises.
                </span>
              </div>

              {/* Logo */}
              <div className="space-y-1">
                <label className="text-xs text-gray-500">
                  Logo de la carte (optionnel)
                </label>
                {isFree ? (
                  <div
                    className="rounded-lg px-3 py-2 text-xs"
                    style={{
                      background: "rgb(var(--ovr) / 0.04)",
                      border: "1px dashed rgb(var(--ovr) / 0.12)",
                      color: "#8a8e84",
                    }}
                  >
                    <Lock size={11} style={{ display: "inline", marginRight: 4, verticalAlign: -1 }} />
                    Logo personnalisé réservé aux plans payants. Passez au plan Essentiel pour débloquer.
                  </div>
                ) : logoData ? (
                  <div
                    className="flex items-center gap-3 rounded-lg p-3"
                    style={{
                      background: "rgb(var(--ovr) / 0.04)",
                      border: "1px solid rgb(var(--ovr) / 0.12)",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoData}
                      alt="Logo preview"
                      style={{
                        height: 44,
                        width: 44,
                        objectFit: "contain",
                        background: "rgb(var(--ovr) / 0.06)",
                        border: "1px solid rgb(var(--ovr) / 0.1)",
                        borderRadius: 8,
                        padding: 4,
                      }}
                    />
                    <div className="flex-1 text-xs" style={{ color: "#c4c8be" }}>
                      Logo importé. Visible en haut-gauche de la carte Wallet.
                    </div>
                    <button
                      type="button"
                      onClick={() => setLogoData("")}
                      className="text-xs flex items-center gap-1 hover:opacity-80"
                      style={{ color: "#ff7a6b" }}
                    >
                      <X size={11} /> Retirer
                    </button>
                  </div>
                ) : (
                  <label
                    className="cursor-pointer block"
                    style={{ display: "block" }}
                  >
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoChange}
                      className="sr-only"
                    />
                    <div
                      className="flex items-center gap-3 rounded-lg transition-colors"
                      style={{
                        padding: "16px 18px",
                        background: "#0a0d04",
                        border: "2px dashed #d4ff4e",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#15170d";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#0a0d04";
                      }}
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                        style={{ background: "rgba(212,255,78,0.18)", color: "#d4ff4e" }}
                      >
                        <ImagePlus size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium" style={{ color: "#f4f5f1" }}>
                          Ajouter un logo personnalisé
                        </div>
                        <div className="text-[11px] mt-0.5" style={{ color: "#8a8e84" }}>
                          PNG, JPG, SVG ou WebP · max 5 MB · haut-gauche de la carte Wallet
                        </div>
                      </div>
                      <div
                        className="hidden sm:block text-xs font-medium whitespace-nowrap"
                        style={{ color: "#d4ff4e" }}
                      >
                        Choisir un fichier →
                      </div>
                    </div>
                  </label>
                )}
                {logoError && (
                  <p className="text-xs text-red-500">{logoError}</p>
                )}
              </div>

              {/* Hero image — uniquement pour POINTS et plan payant */}
              {program.type === "POINTS" && !isFree && (
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">
                    Image de la carte (remplace la zone des tampons)
                  </label>
                  {heroImage ? (
                    <div
                      className="flex items-center gap-3 rounded-lg p-3"
                      style={{
                        background: "rgb(var(--ovr) / 0.04)",
                        border: "1px solid rgb(var(--ovr) / 0.12)",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={heroImage}
                        alt="Hero preview"
                        style={{
                          height: 44,
                          width: 66,
                          objectFit: "cover",
                          background: "rgb(var(--ovr) / 0.06)",
                          border: "1px solid rgb(var(--ovr) / 0.1)",
                          borderRadius: 6,
                        }}
                      />
                      <div className="flex-1 text-xs" style={{ color: "#c4c8be" }}>
                        Image importée. Affichée sur toute la largeur du strip.
                      </div>
                      <button
                        type="button"
                        onClick={() => setHeroImage("")}
                        className="text-xs flex items-center gap-1 hover:opacity-80"
                        style={{ color: "#ff7a6b" }}
                      >
                        <X size={11} /> Retirer
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleHeroChange}
                        className="sr-only"
                      />
                      <div
                        className="flex items-center gap-3 rounded-lg transition-colors"
                        style={{
                          padding: "16px 18px",
                          background: "#0a0d04",
                          border: "2px dashed #d4ff4e",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#15170d";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#0a0d04";
                        }}
                      >
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                          style={{ background: "rgba(212,255,78,0.18)", color: "#d4ff4e" }}
                        >
                          <ImagePlus size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium" style={{ color: "#f4f5f1" }}>
                            Ajouter l&apos;image de la carte
                          </div>
                          <div className="text-[11px] mt-0.5" style={{ color: "#8a8e84" }}>
                            PNG, JPG ou WebP · max 5 MB · ratio paysage recommandé
                          </div>
                        </div>
                        <div
                          className="hidden sm:block text-xs font-medium whitespace-nowrap"
                          style={{ color: "#d4ff4e" }}
                        >
                          Choisir un fichier →
                        </div>
                      </div>
                    </label>
                  )}
                  {heroError && (
                    <p className="text-xs text-red-500">{heroError}</p>
                  )}
                </div>
              )}

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
                            : "1px solid rgb(var(--ovr) / 0.12)",
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

              {/* Personnalisation des tampons — STAMPS + plan payant */}
              {program.type === "STAMPS" && !isFree && (
                <div
                  className="space-y-2 rounded-lg p-3"
                  style={{
                    background: "rgb(var(--ovr) / 0.03)",
                    border: "1px solid rgb(var(--ovr) / 0.08)",
                  }}
                >
                  <label className="text-xs font-medium" style={{ color: "#c4c8be" }}>
                    Tampons personnalisés
                  </label>
                  <StampCustomizer
                    dark
                    stampIcon={stampIcon}
                    setStampIcon={setStampIcon}
                    stampSpacing={stampSpacing}
                    setStampSpacing={setStampSpacing}
                    stampAreaInset={stampAreaInset}
                    setStampAreaInset={setStampAreaInset}
                    stampAreaRadius={stampAreaRadius}
                    setStampAreaRadius={setStampAreaRadius}
                    stampBgType={stampBgType}
                    setStampBgType={setStampBgType}
                    stampBgColor={stampBgColor}
                    setStampBgColor={setStampBgColor}
                    stampBgColor2={stampBgColor2}
                    setStampBgColor2={setStampBgColor2}
                    stampBgImage={stampBgImage}
                    onStampBgImageChange={handleStampBgImageChange}
                    setStampBgImage={setStampBgImage}
                    stampBgError={stampBgError}
                  />
                </div>
              )}
            </div>

              {/* Right : live preview */}
            <div style={{ position: "sticky", top: 0 }}>
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider text-center">
                Aperçu live
              </p>
              <WalletPreviewPair
                bgColor={bgColor}
                textColor={textColor}
                stampColor={stampColor}
                stampCheckColor={stampCheckColor}
                stampEmptyColor={stampEmptyColor}
                labelColor={labelColor}
                programName={name}
                offerText={program.rewards[0]?.name || "Votre dernière offre"}
                merchantName={
                  establishments.find((est) => est.id === establishmentId)?.name ||
                  program.establishment?.name ||
                  program.merchant?.name ||
                  (session?.user as { name?: string | null } | undefined)?.name ||
                  "Votre commerce"
                }
                maxStamps={maxStamps}
                logoData={logoData || undefined}
                notificationLogoData={notificationLogoData || undefined}
                programType={program.type}
                heroImage={heroImage || undefined}
                stampIcon={stampIcon}
                stampSpacing={stampSpacing}
                stampAreaInset={stampAreaInset}
                stampAreaRadius={stampAreaRadius}
                stampBgType={program.type === "STAMPS" && !isFree ? stampBgType : "none"}
                stampBgColor={stampBgColor}
                stampBgColor2={stampBgColor2 || undefined}
                stampBgImage={stampBgImage || undefined}
                unlimited={
                  program.type === "POINTS" && config.unlimited === true
                }
                samplePoints={
                  program.type === "POINTS"
                    ? config.unlimited === true
                      ? 123
                      : Math.floor(maxStamps * 0.3)
                    : undefined
                }
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              className="program-edit-cancel"
              onClick={onClose}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
